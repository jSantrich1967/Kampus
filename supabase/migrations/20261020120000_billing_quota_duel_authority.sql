-- Authority for Pro, atomic quotas, and duel answer keys.
-- Authenticated users can read their own entitlement. They cannot write it.
-- The plan inside profiles.body is not an authorization source.

create table if not exists public.billing_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.billing_entitlements enable row level security;

drop policy if exists billing_entitlements_select_own on public.billing_entitlements;
create policy billing_entitlements_select_own
  on public.billing_entitlements
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.billing_entitlements from public, anon, authenticated;
grant select on public.billing_entitlements to authenticated;
grant all on public.billing_entitlements to service_role;

-- Keep a client-written plan from sticking. Service role and the database
-- owner (security definer functions) may still mirror a granted plan.
create or replace function public.protect_profile_plan()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.body := coalesce(new.body, '{}'::jsonb) - 'plan';
    elsif old.body ? 'plan' then
      new.body := jsonb_set(
        coalesce(new.body, '{}'::jsonb),
        '{plan}',
        old.body -> 'plan',
        true
      );
    else
      new.body := coalesce(new.body, '{}'::jsonb) - 'plan';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_plan on public.profiles;
create trigger profiles_protect_plan
  before insert or update on public.profiles
  for each row
  execute function public.protect_profile_plan();

insert into public.billing_entitlements (user_id, plan, expires_at)
select user_id, 'premium', max(expires_at)
from public.pro_subscriptions
where status = 'active' and expires_at > now()
group by user_id
on conflict (user_id) do update
set plan = 'premium',
    expires_at = excluded.expires_at,
    updated_at = now();

create or replace function public.review_pro_payment(
  p_subscription_id uuid,
  p_action text,
  p_reviewer uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sub public.pro_subscriptions%rowtype;
  current_expires timestamptz;
  base_at timestamptz;
  new_expires timestamptz;
  updated_count int;
  profile_body jsonb;
begin
  if p_reviewer is null or not exists (
    select 1 from public.app_admins a where a.user_id = p_reviewer
  ) then
    raise exception 'forbidden';
  end if;

  if p_action not in ('activate', 'reject') then
    raise exception 'invalid_action';
  end if;

  select * into sub
  from public.pro_subscriptions
  where id = p_subscription_id
  for update;

  if not found then
    raise exception 'not_found';
  end if;

  if sub.status <> 'pending' then
    raise exception 'already_processed';
  end if;

  if p_action = 'reject' then
    update public.pro_subscriptions
    set status = 'rejected',
        reviewed_by = p_reviewer,
        reviewed_at = now()
    where id = p_subscription_id and status = 'pending';
    get diagnostics updated_count = row_count;
    if updated_count <> 1 then
      raise exception 'write_failed';
    end if;
    return jsonb_build_object('ok', true);
  end if;

  select max(expires_at) into current_expires
  from public.pro_subscriptions
  where user_id = sub.user_id
    and status = 'active'
    and expires_at > now();

  base_at := greatest(now(), coalesce(current_expires, now()));
  new_expires := base_at + (sub.months * 30) * interval '1 day';

  update public.pro_subscriptions
  set status = 'active',
      starts_at = now(),
      expires_at = new_expires,
      reviewed_by = p_reviewer,
      reviewed_at = now()
  where id = p_subscription_id and status = 'pending';
  get diagnostics updated_count = row_count;
  if updated_count <> 1 then
    raise exception 'write_failed';
  end if;

  insert into public.billing_entitlements (user_id, plan, expires_at, updated_at)
  values (sub.user_id, 'premium', new_expires, now())
  on conflict (user_id) do update
  set plan = 'premium',
      expires_at = excluded.expires_at,
      updated_at = now();

  select body into profile_body
  from public.profiles
  where id = sub.user_id
  for update;
  if found then
    update public.profiles
    set body = jsonb_set(coalesce(profile_body, '{}'::jsonb), '{plan}', '"premium"'::jsonb, true)
    where id = sub.user_id;
  end if;

  return jsonb_build_object('ok', true, 'expiresAt', new_expires);
end;
$$;

revoke all on function public.review_pro_payment(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.review_pro_payment(uuid, text, uuid) to service_role;

create or replace function public.expire_pro_entitlements()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count int;
begin
  update public.pro_subscriptions
  set status = 'expired'
  where status = 'active' and expires_at < now();
  get diagnostics expired_count = row_count;

  update public.billing_entitlements e
  set plan = 'free',
      expires_at = null,
      updated_at = now()
  where e.plan = 'premium'
    and not exists (
      select 1 from public.pro_subscriptions s
      where s.user_id = e.user_id
        and s.status = 'active'
        and s.expires_at > now()
    );

  update public.profiles p
  set body = jsonb_set(coalesce(p.body, '{}'::jsonb), '{plan}', '"free"'::jsonb, true)
  where coalesce(p.body ->> 'plan', 'free') = 'premium'
    and not exists (
      select 1 from public.pro_subscriptions s
      where s.user_id = p.id
        and s.status = 'active'
        and s.expires_at > now()
    );

  return expired_count;
end;
$$;

revoke all on function public.expire_pro_entitlements() from public, anon, authenticated;
grant execute on function public.expire_pro_entitlements() to service_role;

alter table public.api_usage_quotas
  add column if not exists last_request_id text;

drop function if exists public.consume_api_quota(text, int);

create or replace function public.consume_api_quota(
  p_quota_key text,
  p_daily_limit int,
  p_request_id text default null
) returns table(allowed boolean, used int, daily_limit int, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  cur_used int;
  cur_request text;
  next_used int;
  lim int;
  request_id text;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'unauthenticated';
  end if;
  if p_quota_key is null or length(trim(p_quota_key)) = 0 or length(p_quota_key) > 80 then
    raise exception 'invalid_quota_key';
  end if;

  lim := greatest(coalesce(p_daily_limit, 0), 0);
  request_id := nullif(trim(coalesce(p_request_id, '')), '');

  select q.used_count, q.last_request_id
    into cur_used, cur_request
  from public.api_usage_quotas q
  where q.user_id = uid
    and q.quota_key = p_quota_key
    and q.quota_day = current_date
  for update;

  if found and request_id is not null and cur_request = request_id then
    allowed := cur_used <= lim;
    used := cur_used;
    daily_limit := lim;
    reset_at := date_trunc('day', now()) + interval '1 day';
    return next;
    return;
  end if;

  if found and cur_used >= lim then
    allowed := false;
    used := cur_used;
    daily_limit := lim;
    reset_at := date_trunc('day', now()) + interval '1 day';
    return next;
    return;
  end if;

  insert into public.api_usage_quotas (
    user_id, quota_key, quota_day, used_count, last_consumed_at, last_request_id
  )
  values (uid, p_quota_key, current_date, 1, now(), request_id)
  on conflict (user_id, quota_key, quota_day)
  do update set
    used_count = public.api_usage_quotas.used_count + 1,
    last_consumed_at = now(),
    last_request_id = excluded.last_request_id,
    updated_at = now()
  where public.api_usage_quotas.used_count < lim
  returning used_count into next_used;

  if next_used is null then
    select q.used_count into cur_used
    from public.api_usage_quotas q
    where q.user_id = uid
      and q.quota_key = p_quota_key
      and q.quota_day = current_date;
    allowed := false;
    used := coalesce(cur_used, lim);
    daily_limit := lim;
    reset_at := date_trunc('day', now()) + interval '1 day';
    return next;
    return;
  end if;

  allowed := next_used <= lim;
  used := next_used;
  daily_limit := lim;
  reset_at := date_trunc('day', now()) + interval '1 day';
  return next;
  return;
end;
$$;

revoke all on function public.consume_api_quota(text, int, text) from public;
grant execute on function public.consume_api_quota(text, int, text) to authenticated;
grant execute on function public.consume_api_quota(text, int, text) to service_role;

-- Duel answer keys stay off the row that PostgREST can read.
create table if not exists public.duel_answer_keys (
  duel_id uuid primary key references public.duels (id) on delete cascade,
  answers jsonb not null
);

alter table public.duel_answer_keys enable row level security;
revoke all on public.duel_answer_keys from public, anon, authenticated;
grant all on public.duel_answer_keys to service_role;

alter table public.duels add column if not exists creator_order jsonb;
alter table public.duels add column if not exists challenger_order jsonb;
alter table public.duels add column if not exists creator_progress integer not null default 0;
alter table public.duels add column if not exists challenger_progress integer not null default 0;

create or replace function public.protect_duel_answer_keys()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  answers jsonb;
  stripped jsonb;
begin
  if new.questions is null or jsonb_typeof(new.questions) <> 'array' then
    return new;
  end if;
  if not exists (
    select 1
    from jsonb_array_elements(new.questions) elem
    where elem ? 'answerIndex'
  ) then
    return new;
  end if;

  select coalesce(jsonb_agg(elem -> 'answerIndex' order by ord), '[]'::jsonb)
    into answers
  from jsonb_array_elements(new.questions) with ordinality as t(elem, ord);

  select coalesce(jsonb_agg(elem - 'answerIndex' order by ord), '[]'::jsonb)
    into stripped
  from jsonb_array_elements(new.questions) with ordinality as t(elem, ord);

  insert into public.duel_answer_keys (duel_id, answers)
  values (new.id, answers)
  on conflict (duel_id) do update set answers = excluded.answers;

  -- The row already exists (AFTER trigger). Strip keys without looping:
  -- the follow-up update has no answerIndex, so this function returns above.
  update public.duels
  set questions = stripped
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists duels_protect_answer_keys on public.duels;
create trigger duels_protect_answer_keys
  after insert or update on public.duels
  for each row
  execute function public.protect_duel_answer_keys();

insert into public.duel_answer_keys (duel_id, answers)
select d.id,
  coalesce(
    (
      select jsonb_agg(elem -> 'answerIndex' order by ord)
      from jsonb_array_elements(d.questions) with ordinality as t(elem, ord)
    ),
    '[]'::jsonb
  )
from public.duels d
where exists (
  select 1 from jsonb_array_elements(d.questions) elem where elem ? 'answerIndex'
)
on conflict (duel_id) do update set answers = excluded.answers;

update public.duels d
set questions = coalesce(
  (
    select jsonb_agg(elem - 'answerIndex' order by ord)
    from jsonb_array_elements(d.questions) with ordinality as t(elem, ord)
  ),
  '[]'::jsonb
)
where exists (
  select 1 from jsonb_array_elements(d.questions) elem where elem ? 'answerIndex'
);

drop policy if exists "duels_read_by_code" on public.duels;
create policy "duels_read_participants"
  on public.duels
  for select
  to authenticated
  using (auth.uid() = creator_id or auth.uid() = challenger_id);

drop policy if exists "duels_update_own" on public.duels;
create policy "duels_update_participants"
  on public.duels
  for update
  to authenticated
  using (auth.uid() = creator_id or auth.uid() = challenger_id)
  with check (auth.uid() = creator_id or auth.uid() = challenger_id);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'review_items'
  ) then
    alter table public.review_items
      add column if not exists successes integer not null default 0;
    update public.review_items
    set successes = reps
    where successes = 0 and reps > 0;
  end if;
end;
$$;
