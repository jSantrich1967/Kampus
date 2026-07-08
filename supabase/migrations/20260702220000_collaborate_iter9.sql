-- Colaboración Iter 9: breakout rooms, session recording, schedule link.

alter table public.virtual_class_sessions
  add column if not exists recording_url text,
  add column if not exists schedule_row_id uuid references public.user_class_schedule (id) on delete set null,
  add column if not exists class_date date;

comment on column public.virtual_class_sessions.recording_url is
  'Optional link to class recording (Drive, YouTube, institution VOD).';
comment on column public.virtual_class_sessions.schedule_row_id is
  'When set, this virtual session is linked to a row in user_class_schedule.';
comment on column public.virtual_class_sessions.class_date is
  'Specific calendar date for the linked schedule occurrence (YYYY-MM-DD).';

create index if not exists virtual_class_sessions_schedule_idx
  on public.virtual_class_sessions (schedule_row_id, class_date);

create table if not exists public.virtual_class_breakout_rooms (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.virtual_class_sessions (id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 80),
  room_code text not null,
  created_at timestamptz not null default now(),
  unique (session_id, room_code)
);

comment on table public.virtual_class_breakout_rooms is
  'Breakout study-room codes per virtual class session — links to collaborate sala-estudio.';

create index if not exists virtual_class_breakout_rooms_session_idx
  on public.virtual_class_breakout_rooms (session_id, created_at asc);

alter table public.virtual_class_breakout_rooms enable row level security;

drop policy if exists "virtual_class_breakout_select_visible" on public.virtual_class_breakout_rooms;
create policy "virtual_class_breakout_select_visible"
  on public.virtual_class_breakout_rooms for select to authenticated
  using (
    exists (
      select 1 from public.virtual_class_sessions s
      where s.id = session_id
        and (
          s.created_by = auth.uid()
          or exists (
            select 1 from public.virtual_class_roster r
            where r.session_id = s.id and r.student_user_id = auth.uid()
          )
          or (
            s.open_enrollment = true
            and s.starts_at >= (now() - interval '2 hours')
          )
        )
    )
  );

drop policy if exists "virtual_class_breakout_insert_creator" on public.virtual_class_breakout_rooms;
create policy "virtual_class_breakout_insert_creator"
  on public.virtual_class_breakout_rooms for insert to authenticated
  with check (
    exists (
      select 1 from public.virtual_class_sessions s
      where s.id = session_id and s.created_by = auth.uid()
    )
  );

drop policy if exists "virtual_class_breakout_delete_creator" on public.virtual_class_breakout_rooms;
create policy "virtual_class_breakout_delete_creator"
  on public.virtual_class_breakout_rooms for delete to authenticated
  using (
    exists (
      select 1 from public.virtual_class_sessions s
      where s.id = session_id and s.created_by = auth.uid()
    )
  );

revoke all on public.virtual_class_breakout_rooms from public;
grant select, insert, delete on table public.virtual_class_breakout_rooms to authenticated;
grant all on table public.virtual_class_breakout_rooms to service_role;
