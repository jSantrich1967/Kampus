-- Kampus: Aula virtual — sesiones en vivo (horario, profesor, tema, cupo, enlaces) + lista de alumnos por sesión.
-- Enlazar al perfil del alumno (app): profiles.body tiene subjects, major, etc.; sirve para sugerir o filtrar en la UI.
-- En Supabase el alumno solo ve sesiones donde existe virtual_class_roster.student_user_id = auth.uid().
-- Flujo docente: insert en virtual_class_sessions (created_by = self) + inserts en virtual_class_roster por cada alumno.

-- ---------------------------------------------------------------------------
-- virtual_class_sessions: una fila por clase programada
-- ---------------------------------------------------------------------------
create table if not exists public.virtual_class_sessions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete cascade,
  course text not null,
  professor_name text not null,
  topic text not null default '',
  room_label text not null default '',
  capacity integer not null default 30
    check (capacity >= 1 and capacity <= 500),
  starts_at timestamptz not null,
  ends_at timestamptz,
  join_url text,
  embed_video_url text,
  presentation_url text,
  created_at timestamptz not null default now()
);

comment on table public.virtual_class_sessions is
  'Sesiones de aula virtual (Meet/Zoom, embed opcional, material). Visibles al creador y a alumnos en roster.';

create index if not exists virtual_class_sessions_created_by_starts_idx
  on public.virtual_class_sessions (created_by, starts_at asc);

create index if not exists virtual_class_sessions_starts_idx
  on public.virtual_class_sessions (starts_at asc);

-- ---------------------------------------------------------------------------
-- virtual_class_roster: alumnos inscritos (cupo = capacity vs count(*))
-- ---------------------------------------------------------------------------
create table if not exists public.virtual_class_roster (
  session_id uuid not null references public.virtual_class_sessions (id) on delete cascade,
  student_user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (session_id, student_user_id)
);

comment on table public.virtual_class_roster is
  'Matrícula por sesión. enrolled en UI = count(*) por session_id; cupo libre = capacity - count.';

create index if not exists virtual_class_roster_student_idx
  on public.virtual_class_roster (student_user_id);

create index if not exists virtual_class_roster_session_idx
  on public.virtual_class_roster (session_id);

-- ---------------------------------------------------------------------------
-- RLS: sesiones (después de existir roster para políticas que lo referencian)
-- ---------------------------------------------------------------------------
alter table public.virtual_class_sessions enable row level security;

drop policy if exists "virtual_class_sessions_select_visible" on public.virtual_class_sessions;
create policy "virtual_class_sessions_select_visible"
  on public.virtual_class_sessions
  for select
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1
      from public.virtual_class_roster r
      where r.session_id = virtual_class_sessions.id
        and r.student_user_id = auth.uid()
    )
  );

drop policy if exists "virtual_class_sessions_insert_creator" on public.virtual_class_sessions;
create policy "virtual_class_sessions_insert_creator"
  on public.virtual_class_sessions
  for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "virtual_class_sessions_update_creator" on public.virtual_class_sessions;
create policy "virtual_class_sessions_update_creator"
  on public.virtual_class_sessions
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "virtual_class_sessions_delete_creator" on public.virtual_class_sessions;
create policy "virtual_class_sessions_delete_creator"
  on public.virtual_class_sessions
  for delete
  to authenticated
  using (created_by = auth.uid());

revoke all on table public.virtual_class_sessions from public;
grant select, insert, update, delete on table public.virtual_class_sessions to authenticated;
grant all on table public.virtual_class_sessions to service_role;

-- ---------------------------------------------------------------------------
-- RLS: roster
-- ---------------------------------------------------------------------------
alter table public.virtual_class_roster enable row level security;

drop policy if exists "virtual_class_roster_select_visible" on public.virtual_class_roster;
create policy "virtual_class_roster_select_visible"
  on public.virtual_class_roster
  for select
  to authenticated
  using (
    student_user_id = auth.uid()
    or exists (
      select 1
      from public.virtual_class_sessions s
      where s.id = session_id
        and s.created_by = auth.uid()
    )
  );

drop policy if exists "virtual_class_roster_insert_creator_within_capacity" on public.virtual_class_roster;
create policy "virtual_class_roster_insert_creator_within_capacity"
  on public.virtual_class_roster
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.virtual_class_sessions s
      where s.id = session_id
        and s.created_by = auth.uid()
    )
    and (
      (select count(*)::integer from public.virtual_class_roster r where r.session_id = virtual_class_roster.session_id)
      < (select s.capacity from public.virtual_class_sessions s where s.id = virtual_class_roster.session_id)
    )
  );

drop policy if exists "virtual_class_roster_delete_creator_or_self" on public.virtual_class_roster;
create policy "virtual_class_roster_delete_creator_or_self"
  on public.virtual_class_roster
  for delete
  to authenticated
  using (
    student_user_id = auth.uid()
    or exists (
      select 1
      from public.virtual_class_sessions s
      where s.id = session_id
        and s.created_by = auth.uid()
    )
  );

revoke all on table public.virtual_class_roster from public;
grant select, insert, delete on table public.virtual_class_roster to authenticated;
grant all on table public.virtual_class_roster to service_role;
