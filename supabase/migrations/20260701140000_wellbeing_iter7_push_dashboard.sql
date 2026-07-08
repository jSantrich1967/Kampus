-- Iter 7: Web Push subscriptions + institution wellbeing trends / risk breakdown.

create table if not exists public.wellbeing_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

comment on table public.wellbeing_push_subscriptions is
  'Web Push endpoints for wellbeing check-in reminders (18:00). One row per device.';

create index if not exists wellbeing_push_subscriptions_user_idx
  on public.wellbeing_push_subscriptions (user_id);

alter table public.wellbeing_push_subscriptions enable row level security;

drop policy if exists "wellbeing_push_subscriptions_select_own" on public.wellbeing_push_subscriptions;
create policy "wellbeing_push_subscriptions_select_own"
  on public.wellbeing_push_subscriptions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "wellbeing_push_subscriptions_insert_own" on public.wellbeing_push_subscriptions;
create policy "wellbeing_push_subscriptions_insert_own"
  on public.wellbeing_push_subscriptions for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "wellbeing_push_subscriptions_update_own" on public.wellbeing_push_subscriptions;
create policy "wellbeing_push_subscriptions_update_own"
  on public.wellbeing_push_subscriptions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "wellbeing_push_subscriptions_delete_own" on public.wellbeing_push_subscriptions;
create policy "wellbeing_push_subscriptions_delete_own"
  on public.wellbeing_push_subscriptions for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.wellbeing_push_subscriptions from public;
grant select, insert, update, delete on table public.wellbeing_push_subscriptions to authenticated;
grant all on table public.wellbeing_push_subscriptions to service_role;

create or replace function public.get_institution_wellbeing_pulse_trends(p_institution_key text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    jsonb_agg(week_row order by week_start asc),
    '[]'::jsonb
  )
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
  ) weekly;
$$;

create or replace function public.get_institution_wellbeing_risk_breakdown(p_institution_key text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
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
    and week_start >= (current_date - interval '14 days')::date;
$$;

revoke all on function public.get_institution_wellbeing_pulse_trends(text) from public;
grant execute on function public.get_institution_wellbeing_pulse_trends(text) to authenticated;

revoke all on function public.get_institution_wellbeing_risk_breakdown(text) from public;
grant execute on function public.get_institution_wellbeing_risk_breakdown(text) to authenticated;
