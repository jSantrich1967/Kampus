-- Institution console (B2B) data per institution admin user.
-- Minimal schema to remove mocks. RLS: only the owning user can read/write.

create table if not exists public.institution_kpis (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.institution_kpis is 'Institution console KPIs (JSON) stored per institution admin user.';

create or replace function public.set_institution_kpis_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists institution_kpis_set_updated_at on public.institution_kpis;
create trigger institution_kpis_set_updated_at
  before update on public.institution_kpis
  for each row
  execute procedure public.set_institution_kpis_updated_at();

alter table public.institution_kpis enable row level security;

drop policy if exists "institution_kpis_select_own" on public.institution_kpis;
create policy "institution_kpis_select_own"
  on public.institution_kpis for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "institution_kpis_upsert_own" on public.institution_kpis;
create policy "institution_kpis_upsert_own"
  on public.institution_kpis for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "institution_kpis_update_own" on public.institution_kpis;
create policy "institution_kpis_update_own"
  on public.institution_kpis for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on public.institution_kpis from public;
grant select, insert, update on table public.institution_kpis to authenticated;
grant all on table public.institution_kpis to service_role;

-- Rows for course-level signals (table layout fits current UI).
create table if not exists public.institution_course_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_code text not null,
  course_name text not null,
  students int not null default 0,
  at_risk_pct int not null default 0,
  avg_score int not null default 0,
  engagement_index int not null default 0,
  hardest_topic text not null default '',
  intervention text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists institution_course_signals_user_idx
  on public.institution_course_signals (user_id, created_at desc);

alter table public.institution_course_signals enable row level security;

drop policy if exists "institution_course_signals_select_own" on public.institution_course_signals;
create policy "institution_course_signals_select_own"
  on public.institution_course_signals for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "institution_course_signals_insert_own" on public.institution_course_signals;
create policy "institution_course_signals_insert_own"
  on public.institution_course_signals for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "institution_course_signals_update_own" on public.institution_course_signals;
create policy "institution_course_signals_update_own"
  on public.institution_course_signals for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "institution_course_signals_delete_own" on public.institution_course_signals;
create policy "institution_course_signals_delete_own"
  on public.institution_course_signals for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.institution_course_signals from public;
grant select, insert, update, delete on table public.institution_course_signals to authenticated;
grant all on table public.institution_course_signals to service_role;

