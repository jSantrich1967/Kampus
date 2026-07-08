-- Anonymized wellbeing pulse contributions (opt-in students). Institution admins aggregate via RPC.

create table if not exists public.wellbeing_institution_contributions (
  user_id uuid not null references auth.users (id) on delete cascade,
  institution_key text not null,
  week_start date not null,
  pulse jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

comment on table public.wellbeing_institution_contributions is
  'Opt-in anonymized wellbeing metrics per student/week. No diary text — JSON counts only.';

create index if not exists wellbeing_institution_contributions_key_week_idx
  on public.wellbeing_institution_contributions (institution_key, week_start desc);

alter table public.wellbeing_institution_contributions enable row level security;

drop policy if exists "wellbeing_institution_contributions_select_own" on public.wellbeing_institution_contributions;
create policy "wellbeing_institution_contributions_select_own"
  on public.wellbeing_institution_contributions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "wellbeing_institution_contributions_insert_own" on public.wellbeing_institution_contributions;
create policy "wellbeing_institution_contributions_insert_own"
  on public.wellbeing_institution_contributions for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "wellbeing_institution_contributions_update_own" on public.wellbeing_institution_contributions;
create policy "wellbeing_institution_contributions_update_own"
  on public.wellbeing_institution_contributions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "wellbeing_institution_contributions_delete_own" on public.wellbeing_institution_contributions;
create policy "wellbeing_institution_contributions_delete_own"
  on public.wellbeing_institution_contributions for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.wellbeing_institution_contributions from public;
grant select, insert, update, delete on table public.wellbeing_institution_contributions to authenticated;
grant all on table public.wellbeing_institution_contributions to service_role;

create or replace function public.get_institution_wellbeing_pulse(p_institution_key text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
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
    and week_start >= (current_date - interval '14 days')::date;
$$;

revoke all on function public.get_institution_wellbeing_pulse(text) from public;
grant execute on function public.get_institution_wellbeing_pulse(text) to authenticated;
