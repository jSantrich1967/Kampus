-- Residues from the 2026-10-20 re-audit.
-- Apply the whole file in Supabase → SQL Editor → Run.
-- Does not edit the migration that is already applied.

-- A signed-in player cannot rewrite a duel. The game API uses service_role
-- (auth.uid() is null). The answer-key strip sets a local flag so its own
-- follow-up update is allowed.
create or replace function public.protect_duel_client_writes()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if current_setting('kampus.duel_key_strip', true) = '1' then
    return new;
  end if;
  raise exception 'duel_write_forbidden' using errcode = '42501';
end;
$$;

drop trigger if exists duels_protect_client_writes on public.duels;
create trigger duels_protect_client_writes
  before update on public.duels
  for each row
  execute function public.protect_duel_client_writes();

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

  perform set_config('kampus.duel_key_strip', '1', true);
  update public.duels
  set questions = stripped
  where id = new.id;

  return new;
end;
$$;

-- Every consumed request id is remembered, not only the last one.
-- A limit of zero does not insert a usage row.
create table if not exists public.api_quota_request_ids (
  user_id uuid not null,
  quota_key text not null,
  quota_day date not null,
  request_id text not null,
  primary key (user_id, quota_key, quota_day, request_id)
);

alter table public.api_quota_request_ids enable row level security;
revoke all on public.api_quota_request_ids from public, anon, authenticated;
grant all on public.api_quota_request_ids to service_role;

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
  next_used int;
  lim int;
  req_id text;
  seen boolean;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'unauthenticated';
  end if;
  if p_quota_key is null or length(trim(p_quota_key)) = 0 or length(p_quota_key) > 80 then
    raise exception 'invalid_quota_key';
  end if;

  lim := greatest(coalesce(p_daily_limit, 0), 0);
  req_id := nullif(trim(coalesce(p_request_id, '')), '');

  select q.used_count
    into cur_used
  from public.api_usage_quotas q
  where q.user_id = uid
    and q.quota_key = p_quota_key
    and q.quota_day = current_date
  for update;

  if req_id is not null then
    select true into seen
    from public.api_quota_request_ids r
    where r.user_id = uid
      and r.quota_key = p_quota_key
      and r.quota_day = current_date
      and r.request_id = req_id;
    if seen then
      allowed := coalesce(cur_used, 0) <= lim;
      used := coalesce(cur_used, 0);
      daily_limit := lim;
      reset_at := date_trunc('day', now()) + interval '1 day';
      return next;
      return;
    end if;
  end if;

  if lim <= 0 or (cur_used is not null and cur_used >= lim) then
    allowed := false;
    used := coalesce(cur_used, 0);
    daily_limit := lim;
    reset_at := date_trunc('day', now()) + interval '1 day';
    return next;
    return;
  end if;

  insert into public.api_usage_quotas (
    user_id, quota_key, quota_day, used_count, last_consumed_at, last_request_id
  )
  values (uid, p_quota_key, current_date, 1, now(), req_id)
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

  if req_id is not null then
    insert into public.api_quota_request_ids (user_id, quota_key, quota_day, request_id)
    values (uid, p_quota_key, current_date, req_id)
    on conflict do nothing;
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

-- Keep a future entitlement (for example prize days) when there is no subscription.
-- A past entitlement date still becomes free.
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
    and (e.expires_at is null or e.expires_at <= now())
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
    )
    and not exists (
      select 1 from public.billing_entitlements e
      where e.user_id = p.id
        and e.plan = 'premium'
        and e.expires_at > now()
    );

  return expired_count;
end;
$$;

revoke all on function public.expire_pro_entitlements() from public, anon, authenticated;
grant execute on function public.expire_pro_entitlements() to service_role;

-- One review session owns a fixed set of cards. Repeating a grade token
-- does not apply SM-2 again.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'review_items'
  ) then
    alter table public.review_items
      add column if not exists last_grade_token text;
  end if;
end;
$$;

create table if not exists public.review_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_day date not null default current_date,
  item_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.review_sessions enable row level security;
revoke all on public.review_sessions from public, anon, authenticated;
grant select on public.review_sessions to authenticated;
grant all on public.review_sessions to service_role;

drop policy if exists review_sessions_select_own on public.review_sessions;
create policy review_sessions_select_own
  on public.review_sessions
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.start_review_session(p_daily_limit int)
returns table(session_id uuid, item_ids uuid[], created boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  existing_id uuid;
  existing_items uuid[];
  fresh_items uuid[];
  quota_allowed boolean;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'unauthenticated';
  end if;

  if p_daily_limit is not null then
    select s.id, s.item_ids
      into existing_id, existing_items
    from public.review_sessions s
    where s.user_id = uid
      and s.session_day = current_date
    order by s.created_at
    limit 1;
    if existing_id is not null then
      session_id := existing_id;
      item_ids := existing_items;
      created := false;
      return next;
      return;
    end if;

    select q.allowed
      into quota_allowed
    from public.consume_api_quota(
      'review_session',
      p_daily_limit,
      'review-session:' || to_char(current_date, 'YYYY-MM-DD')
    ) q;
    if quota_allowed is not true then
      raise exception 'review_session_exhausted';
    end if;
  end if;

  select coalesce(array(
    select r.id
    from public.review_items r
    where r.user_id = uid
      and r.next_due <= now()
    order by r.next_due
    limit 20
  ), '{}'::uuid[])
  into fresh_items;

  insert into public.review_sessions (user_id, session_day, item_ids)
  values (uid, current_date, fresh_items)
  returning id into existing_id;

  session_id := existing_id;
  item_ids := fresh_items;
  created := true;
  return next;
  return;
end;
$$;

revoke all on function public.start_review_session(int) from public;
grant execute on function public.start_review_session(int) to authenticated;
grant execute on function public.start_review_session(int) to service_role;
