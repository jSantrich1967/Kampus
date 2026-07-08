-- Iter 8: proactive counselor alerts (opt-in students).

create table if not exists public.wellbeing_counselor_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  institution_key text not null,
  week_start date not null,
  risk_level text not null check (risk_level in ('watch', 'elevated')),
  risk_score int not null check (risk_score >= 0 and risk_score <= 100),
  reasons jsonb not null default '[]'::jsonb,
  channel text not null check (channel in ('auto', 'manual')),
  created_at timestamptz not null default now()
);

comment on table public.wellbeing_counselor_alerts is
  'Opt-in proactive signals for orientation teams — metrics only, no diary text.';

create index if not exists wellbeing_counselor_alerts_institution_idx
  on public.wellbeing_counselor_alerts (institution_key, created_at desc);

create unique index if not exists wellbeing_counselor_alerts_auto_week_uidx
  on public.wellbeing_counselor_alerts (user_id, week_start, channel)
  where channel = 'auto';

alter table public.wellbeing_counselor_alerts enable row level security;

drop policy if exists "wellbeing_counselor_alerts_select_own" on public.wellbeing_counselor_alerts;
create policy "wellbeing_counselor_alerts_select_own"
  on public.wellbeing_counselor_alerts for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "wellbeing_counselor_alerts_insert_own" on public.wellbeing_counselor_alerts;
create policy "wellbeing_counselor_alerts_insert_own"
  on public.wellbeing_counselor_alerts for insert to authenticated
  with check (auth.uid() = user_id);

revoke all on public.wellbeing_counselor_alerts from public;
grant select, insert on table public.wellbeing_counselor_alerts to authenticated;
grant all on table public.wellbeing_counselor_alerts to service_role;

create or replace function public.get_institution_counselor_alerts_summary(p_institution_key text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
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
    and created_at >= (now() - interval '14 days');
$$;

revoke all on function public.get_institution_counselor_alerts_summary(text) from public;
grant execute on function public.get_institution_counselor_alerts_summary(text) to authenticated;
