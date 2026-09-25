-- Security boundaries: quotas, study-room membership, institution pulse access.
-- Apply in the Supabase SQL editor (or supabase db push) after the earlier migrations.

-- ---------------------------------------------------------------------------
-- 1. OpenAI quotas: clients can read their counter, not rewrite it.
-- ---------------------------------------------------------------------------

drop policy if exists "api_usage_quotas_insert_own" on public.api_usage_quotas;
drop policy if exists "api_usage_quotas_update_own" on public.api_usage_quotas;

revoke insert, update on table public.api_usage_quotas from authenticated;

create or replace function public.consume_api_quota(p_quota_key text, p_daily_limit int)
returns table(allowed boolean, used int, daily_limit int, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  next_used int;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'unauthenticated';
  end if;
  if p_quota_key is null or length(trim(p_quota_key)) = 0 or length(p_quota_key) > 80 then
    raise exception 'invalid_quota_key';
  end if;

  insert into public.api_usage_quotas (user_id, quota_key, quota_day, used_count)
  values (uid, p_quota_key, current_date, 1)
  on conflict (user_id, quota_key, quota_day)
  do update set used_count = public.api_usage_quotas.used_count + 1,
               updated_at = now()
  returning used_count into next_used;

  allowed := next_used <= greatest(p_daily_limit, 0);
  used := next_used;
  daily_limit := p_daily_limit;
  reset_at := date_trunc('day', now()) + interval '1 day';
  return next;
end;
$$;

revoke all on function public.consume_api_quota(text, int) from public;
grant execute on function public.consume_api_quota(text, int) to authenticated;
grant execute on function public.consume_api_quota(text, int) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Study rooms: knowing the code joins you. Listing every room is closed.
-- ---------------------------------------------------------------------------

create table if not exists public.collaborate_study_room_members (
  room_code text not null references public.collaborate_study_rooms (room_code) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_code, user_id)
);

alter table public.collaborate_study_room_members enable row level security;

drop policy if exists "collaborate_study_room_members_select_own" on public.collaborate_study_room_members;
create policy "collaborate_study_room_members_select_own"
  on public.collaborate_study_room_members for select to authenticated
  using (auth.uid() = user_id);

revoke all on public.collaborate_study_room_members from public;
grant select on table public.collaborate_study_room_members to authenticated;
grant all on table public.collaborate_study_room_members to service_role;

create or replace function public.join_collaborate_study_room(p_room_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  code text := lower(trim(coalesce(p_room_code, '')));
begin
  if uid is null then
    raise exception 'unauthenticated';
  end if;
  if code = 'default' or code !~ '^[a-z0-9_-]{4,32}$' then
    raise exception 'invalid_room_code';
  end if;

  insert into public.collaborate_study_rooms (room_code, state, updated_by)
  values (code, '{}'::jsonb, uid)
  on conflict (room_code) do nothing;

  insert into public.collaborate_study_room_members (room_code, user_id)
  values (code, uid)
  on conflict (room_code, user_id) do nothing;
end;
$$;

revoke all on function public.join_collaborate_study_room(text) from public;
grant execute on function public.join_collaborate_study_room(text) to authenticated;

drop policy if exists "collaborate_study_rooms_select_auth" on public.collaborate_study_rooms;
drop policy if exists "collaborate_study_rooms_insert_auth" on public.collaborate_study_rooms;
drop policy if exists "collaborate_study_rooms_update_auth" on public.collaborate_study_rooms;

create policy "collaborate_study_rooms_select_member"
  on public.collaborate_study_rooms for select to authenticated
  using (
    exists (
      select 1 from public.collaborate_study_room_members m
      where m.room_code = collaborate_study_rooms.room_code
        and m.user_id = auth.uid()
    )
  );

create policy "collaborate_study_rooms_update_member"
  on public.collaborate_study_rooms for update to authenticated
  using (
    exists (
      select 1 from public.collaborate_study_room_members m
      where m.room_code = collaborate_study_rooms.room_code
        and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.collaborate_study_room_members m
      where m.room_code = collaborate_study_rooms.room_code
        and m.user_id = auth.uid()
    )
  );

revoke insert on table public.collaborate_study_rooms from authenticated;

drop policy if exists "collaborate_study_room_messages_select_auth" on public.collaborate_study_room_messages;
create policy "collaborate_study_room_messages_select_member"
  on public.collaborate_study_room_messages for select to authenticated
  using (
    exists (
      select 1 from public.collaborate_study_room_members m
      where m.room_code = collaborate_study_room_messages.room_code
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "collaborate_study_room_messages_insert_own" on public.collaborate_study_room_messages;
create policy "collaborate_study_room_messages_insert_member"
  on public.collaborate_study_room_messages for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.collaborate_study_room_members m
      where m.room_code = collaborate_study_room_messages.room_code
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "collaborate_study_room_presence_select_auth" on public.collaborate_study_room_presence;
create policy "collaborate_study_room_presence_select_member"
  on public.collaborate_study_room_presence for select to authenticated
  using (
    exists (
      select 1 from public.collaborate_study_room_members m
      where m.room_code = collaborate_study_room_presence.room_code
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "collaborate_study_room_presence_insert_own" on public.collaborate_study_room_presence;
create policy "collaborate_study_room_presence_insert_member"
  on public.collaborate_study_room_presence for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.collaborate_study_room_members m
      where m.room_code = collaborate_study_room_presence.room_code
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "collaborate_study_room_presence_update_own" on public.collaborate_study_room_presence;
create policy "collaborate_study_room_presence_update_member"
  on public.collaborate_study_room_presence for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.collaborate_study_room_members m
      where m.room_code = collaborate_study_room_presence.room_code
        and m.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Institution aggregates: only the institution role, and only its own key.
-- ---------------------------------------------------------------------------

create table if not exists public.institution_key_aliases (
  institution_key text not null,
  alias text not null,
  primary key (institution_key, alias)
);

insert into public.institution_key_aliases (institution_key, alias) values
  ('ucv', 'ucv'),
  ('ucv', 'universidad-central-de-venezuela'),
  ('ucv', 'central-de-venezuela'),
  ('usb', 'usb'),
  ('usb', 'universidad-simon-bolivar'),
  ('usb', 'simon-bolivar'),
  ('ula', 'ula'),
  ('ula', 'universidad-de-los-andes'),
  ('ula', 'los-andes'),
  ('ucab', 'ucab'),
  ('ucab', 'universidad-catolica-andres-bello'),
  ('ucab', 'catolica-andres-bello'),
  ('unimet', 'unimet'),
  ('unimet', 'universidad-metropolitana'),
  ('unimet', 'metropolitana'),
  ('luz', 'luz'),
  ('luz', 'universidad-del-zulia'),
  ('luz', 'del-zulia'),
  ('unexpo', 'unexpo'),
  ('unexpo', 'universidad-nacional-experimental-politecnica'),
  ('unexpo', 'politecnica-unexpo'),
  ('ubv', 'ubv'),
  ('ubv', 'universidad-bolivariana-de-venezuela'),
  ('ubv', 'bolivariana'),
  ('uc', 'universidad-de-carabobo'),
  ('uc', 'carabobo')
on conflict do nothing;

alter table public.institution_key_aliases enable row level security;
revoke all on public.institution_key_aliases from public;
revoke all on public.institution_key_aliases from authenticated;

create or replace function public.normalize_institution_slug(raw text)
returns text
language sql
immutable
as $$
  select left(
    trim(both '-' from regexp_replace(
      translate(
        lower(trim(coalesce(raw, ''))),
        'áéíóúüñàèìòùâêîôûäëïöÿ',
        'aeiouunaeiouaeiouaeioy'
      ),
      '[^a-z0-9]+', '-', 'g')),
    80);
$$;

create or replace function public.caller_may_read_institution(p_institution_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  body jsonb;
  slug text;
  expected text;
begin
  if auth.uid() is null or p_institution_key is null or length(trim(p_institution_key)) < 2 then
    return false;
  end if;

  select p.body into body
  from public.profiles p
  where p.id = auth.uid();

  if lower(coalesce(body->>'role', '')) <> 'institution' then
    return false;
  end if;

  slug := public.normalize_institution_slug(body->>'university');
  if length(slug) < 2 then
    return false;
  end if;

  select a.institution_key into expected
  from public.institution_key_aliases a
  where slug = a.alias or position(a.alias in slug) > 0
  order by length(a.alias) desc
  limit 1;

  expected := coalesce(expected, slug);
  return expected = p_institution_key;
end;
$$;

create or replace function public.assert_institution_reader(p_institution_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.caller_may_read_institution(p_institution_key) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.normalize_institution_slug(text) from public;
revoke all on function public.caller_may_read_institution(text) from public;
revoke all on function public.assert_institution_reader(text) from public;

create or replace function public.get_institution_wellbeing_pulse(p_institution_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  perform public.assert_institution_reader(p_institution_key);
  return (
    select coalesce(
      jsonb_build_object(
        'sample_size', count(*)::int,
        'avg_entries_7d', round(avg((pulse->>'entriesLast7Days')::numeric), 1),
        'avg_energy_7d', round(avg((pulse->>'averageEnergy7d')::numeric), 1),
        'avg_low_mood_days', round(avg((pulse->>'lowMoodDays7d')::numeric), 1),
        'avg_stress_tags', round(avg((pulse->>'stressTagCount7d')::numeric), 1),
        'elevated_count', count(*) filter (where pulse->>'riskLevel' = 'elevated')::int,
        'watch_count', count(*) filter (where pulse->>'riskLevel' = 'watch')::int
      ),
      '{}'::jsonb
    )
    from public.wellbeing_institution_contributions
    where institution_key = p_institution_key
      and week_start >= (current_date - interval '14 days')::date
  );
end;
$$;

create or replace function public.get_institution_wellbeing_pulse_trends(p_institution_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  perform public.assert_institution_reader(p_institution_key);
  return (
    select coalesce(jsonb_agg(week_row order by week_start asc), '[]'::jsonb)
    from (
      select
        week_start,
        jsonb_build_object(
          'week_start', week_start,
          'sample_size', count(*)::int,
          'avg_entries_7d', round(avg((pulse->>'entriesLast7Days')::numeric), 1),
          'avg_energy_7d', round(avg((pulse->>'averageEnergy7d')::numeric), 1),
          'watch_count', count(*) filter (where pulse->>'riskLevel' = 'watch')::int,
          'elevated_count', count(*) filter (where pulse->>'riskLevel' = 'elevated')::int
        ) as week_row
      from public.wellbeing_institution_contributions
      where institution_key = p_institution_key
        and week_start >= (current_date - interval '56 days')::date
      group by week_start
    ) weekly
  );
end;
$$;

create or replace function public.get_institution_wellbeing_risk_breakdown(p_institution_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  perform public.assert_institution_reader(p_institution_key);
  return (
    select coalesce(
      jsonb_build_object(
        'sample_size', count(*)::int,
        'ok_count', count(*) filter (where coalesce(pulse->>'riskLevel', 'ok') = 'ok')::int,
        'watch_count', count(*) filter (where pulse->>'riskLevel' = 'watch')::int,
        'elevated_count', count(*) filter (where pulse->>'riskLevel' = 'elevated')::int,
        'avg_low_mood_days', round(avg((pulse->>'lowMoodDays7d')::numeric), 1),
        'avg_stress_tags', round(avg((pulse->>'stressTagCount7d')::numeric), 1)
      ),
      '{}'::jsonb
    )
    from public.wellbeing_institution_contributions
    where institution_key = p_institution_key
      and week_start >= (current_date - interval '14 days')::date
  );
end;
$$;

create or replace function public.get_institution_counselor_alerts_summary(p_institution_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  perform public.assert_institution_reader(p_institution_key);
  return (
    select coalesce(
      jsonb_build_object(
        'alerts_14d', count(*)::int,
        'watch_count', count(*) filter (where risk_level = 'watch')::int,
        'elevated_count', count(*) filter (where risk_level = 'elevated')::int,
        'auto_count', count(*) filter (where channel = 'auto')::int,
        'manual_count', count(*) filter (where channel = 'manual')::int,
        'last_alert_at', max(created_at)
      ),
      jsonb_build_object(
        'alerts_14d', 0,
        'watch_count', 0,
        'elevated_count', 0,
        'auto_count', 0,
        'manual_count', 0,
        'last_alert_at', null
      )
    )
    from public.wellbeing_counselor_alerts
    where institution_key = p_institution_key
      and created_at >= (now() - interval '14 days')
  );
end;
$$;
