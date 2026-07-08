-- Colaboración Iter 4: shared study rooms in cloud (by room code).

create table if not exists public.collaborate_study_rooms (
  room_code text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

comment on table public.collaborate_study_rooms is
  'Shared study room state keyed by invite code — agenda, notes, goal (no PII required).';

alter table public.collaborate_study_rooms enable row level security;

drop policy if exists "collaborate_study_rooms_select_auth" on public.collaborate_study_rooms;
create policy "collaborate_study_rooms_select_auth"
  on public.collaborate_study_rooms for select to authenticated
  using (true);

drop policy if exists "collaborate_study_rooms_insert_auth" on public.collaborate_study_rooms;
create policy "collaborate_study_rooms_insert_auth"
  on public.collaborate_study_rooms for insert to authenticated
  with check (true);

drop policy if exists "collaborate_study_rooms_update_auth" on public.collaborate_study_rooms;
create policy "collaborate_study_rooms_update_auth"
  on public.collaborate_study_rooms for update to authenticated
  using (true)
  with check (true);

revoke all on public.collaborate_study_rooms from public;
grant select, insert, update on table public.collaborate_study_rooms to authenticated;
grant all on table public.collaborate_study_rooms to service_role;
