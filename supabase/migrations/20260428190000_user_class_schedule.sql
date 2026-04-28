-- Kampus: horario semanal fijo de clases (Mi calendario) + RLS.

create table if not exists public.user_class_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  /** Monday=0 ... Sunday=6 */
  weekday smallint not null check (weekday >= 0 and weekday <= 6),
  start_time time not null,
  end_time time not null,
  subject text not null,
  location text not null default '',
  professor_name text not null default '',
  created_at timestamptz not null default now(),
  constraint user_class_schedule_time_check check (end_time > start_time)
);

comment on table public.user_class_schedule is
  'Horario semanal fijo: eventos recurrentes para Mi calendario, enlazados a cuadernos por materia.';

create index if not exists user_class_schedule_user_weekday_idx
  on public.user_class_schedule (user_id, weekday, start_time);

alter table public.user_class_schedule enable row level security;

drop policy if exists "user_class_schedule_select_own" on public.user_class_schedule;
create policy "user_class_schedule_select_own"
  on public.user_class_schedule for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_class_schedule_insert_own" on public.user_class_schedule;
create policy "user_class_schedule_insert_own"
  on public.user_class_schedule for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_class_schedule_update_own" on public.user_class_schedule;
create policy "user_class_schedule_update_own"
  on public.user_class_schedule for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_class_schedule_delete_own" on public.user_class_schedule;
create policy "user_class_schedule_delete_own"
  on public.user_class_schedule for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.user_class_schedule from public;
grant select, insert, update, delete on table public.user_class_schedule to authenticated;
grant all on table public.user_class_schedule to service_role;

