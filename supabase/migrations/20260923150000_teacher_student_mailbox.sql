-- Kampus: conexión profesor ↔ estudiante sin exponer perfiles.
--
-- - student_submissions: el estudiante envía trabajos/informes a su profesor; el
--   profesor los corrige (devolución + nota 0-20). Ninguna de las partes puede
--   ver el perfil de la otra: los nombres se guardan como instantánea
--   (student_display_name / teacher_display_name) y la app nunca consulta la
--   tabla profiles de terceros (su RLS es solo-lectura propia).
-- - teacher_announcements: avisos/material del profesor para sus estudiantes
--   (todos o los de una sesión del aula virtual).
--
-- La "conexión" profesor↔estudiante se deriva de la matrícula del aula
-- virtual: un estudiante solo puede escribir a profesores de sesiones donde
-- está inscrito, y solo recibe avisos de esos profesores.
--
-- IDEMPOTENTE: puede ejecutarse varias veces sin daño.
-- APLICAR: Supabase → SQL Editor → pegar → Run.
--
-- NOTA: la tabla student_works ya existe en producción (tareas propias del
-- estudiante, creada en 2024). Esta funcionalidad usa student_submissions
-- para no chocar con ella.

-- La primera versión de este script pisó el comentario de student_works;
-- lo restauramos a algo neutral.
comment on table public.student_works is
  'Tareas/trabajos propios del estudiante (funcionalidad existente).';

-- ---------------------------------------------------------------------------
-- Helpers SECURITY DEFINER (evitan recursión con las políticas del aula)
-- ---------------------------------------------------------------------------

-- ¿Es p_teacher_id profesor del usuario autenticado? (tiene una sesión donde
-- el usuario está en el roster).
create or replace function public.ts_is_my_teacher(p_teacher_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.virtual_class_sessions s
    join public.virtual_class_roster r on r.session_id = s.id
    where s.created_by = p_teacher_id
      and r.student_user_id = auth.uid()
  );
$$;

-- Profesores del usuario autenticado (id + nombre para mostrar).
create or replace function public.list_my_teachers()
returns table (teacher_user_id uuid, display_name text)
language sql
security definer
set search_path = public
stable
as $$
  select distinct
    s.created_by as teacher_user_id,
    coalesce(nullif(trim(p.body->>'displayName'), ''), 'Profesor') as display_name
  from public.virtual_class_sessions s
  join public.virtual_class_roster r on r.session_id = s.id
  left join public.profiles p on p.id = s.created_by
  where r.student_user_id = auth.uid()
  order by display_name;
$$;

revoke all on function public.ts_is_my_teacher(uuid) from public;
revoke all on function public.list_my_teachers() from public;
grant execute on function public.ts_is_my_teacher(uuid) to authenticated;
grant execute on function public.list_my_teachers() to authenticated;

-- ---------------------------------------------------------------------------
-- student_submissions: trabajos/informes del estudiante → corrección del profesor
-- ---------------------------------------------------------------------------

create table if not exists public.student_submissions (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references auth.users (id) on delete cascade,
  teacher_user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.virtual_class_sessions (id) on delete set null,
  course text not null default '',
  title text not null,
  body text not null,
  student_display_name text not null default 'Estudiante',
  teacher_display_name text not null default 'Profesor',
  status text not null default 'sent' check (status in ('sent', 'reviewed')),
  feedback text not null default '',
  grade numeric check (grade is null or (grade >= 0 and grade <= 20)),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

comment on table public.student_submissions is
  'Trabajos/informes que el estudiante envía a su profesor y la corrección devuelta. Sin acceso cruzado a perfiles.';

create index if not exists student_submissions_student_idx
  on public.student_submissions (student_user_id, created_at desc);
create index if not exists student_submissions_teacher_idx
  on public.student_submissions (teacher_user_id, status, created_at desc);

alter table public.student_submissions enable row level security;

-- El estudiante envía a un profesor suyo (de una sesión donde está inscrito).
drop policy if exists "student_submissions_insert_student" on public.student_submissions;
create policy "student_submissions_insert_student"
  on public.student_submissions
  for insert
  to authenticated
  with check (
    student_user_id = auth.uid()
    and public.ts_is_my_teacher(teacher_user_id)
  );

-- El estudiante ve sus propios envíos (con la devolución del profesor).
drop policy if exists "student_submissions_select_student" on public.student_submissions;
create policy "student_submissions_select_student"
  on public.student_submissions
  for select
  to authenticated
  using (student_user_id = auth.uid());

-- El profesor ve los trabajos que le enviaron.
drop policy if exists "student_submissions_select_teacher" on public.student_submissions;
create policy "student_submissions_select_teacher"
  on public.student_submissions
  for select
  to authenticated
  using (teacher_user_id = auth.uid());

-- El profesor corrige: devolución, nota y estado.
drop policy if exists "student_submissions_update_teacher" on public.student_submissions;
create policy "student_submissions_update_teacher"
  on public.student_submissions
  for update
  to authenticated
  using (teacher_user_id = auth.uid())
  with check (teacher_user_id = auth.uid());

revoke all on table public.student_submissions from public;
grant select, insert, update on table public.student_submissions to authenticated;
grant all on table public.student_submissions to service_role;

-- ---------------------------------------------------------------------------
-- teacher_announcements: avisos/material del profesor → sus estudiantes
-- ---------------------------------------------------------------------------

create table if not exists public.teacher_announcements (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.virtual_class_sessions (id) on delete set null,
  course text not null default '',
  title text not null,
  body text not null,
  teacher_display_name text not null default 'Profesor',
  created_at timestamptz not null default now()
);

comment on table public.teacher_announcements is
  'Avisos y material del profesor. session_id null = todos sus estudiantes; con session_id = solo el roster de esa sesión.';

create index if not exists teacher_announcements_teacher_idx
  on public.teacher_announcements (teacher_user_id, created_at desc);
create index if not exists teacher_announcements_session_idx
  on public.teacher_announcements (session_id, created_at desc);

alter table public.teacher_announcements enable row level security;

-- El profesor publica avisos.
drop policy if exists "teacher_announcements_insert_teacher" on public.teacher_announcements;
create policy "teacher_announcements_insert_teacher"
  on public.teacher_announcements
  for insert
  to authenticated
  with check (teacher_user_id = auth.uid());

-- El profesor ve y gestiona los suyos.
drop policy if exists "teacher_announcements_select_teacher" on public.teacher_announcements;
create policy "teacher_announcements_select_teacher"
  on public.teacher_announcements
  for select
  to authenticated
  using (teacher_user_id = auth.uid());

drop policy if exists "teacher_announcements_delete_teacher" on public.teacher_announcements;
create policy "teacher_announcements_delete_teacher"
  on public.teacher_announcements
  for delete
  to authenticated
  using (teacher_user_id = auth.uid());

-- El estudiante ve avisos de sus profesores (todos o los de su sesión).
-- El subselect sobre sessions pasa por su política con SECURITY DEFINER:
-- no hay recursión.
drop policy if exists "teacher_announcements_select_student" on public.teacher_announcements;
create policy "teacher_announcements_select_student"
  on public.teacher_announcements
  for select
  to authenticated
  using (
    public.ts_is_my_teacher(teacher_user_id)
    and (
      session_id is null
      or public.vc_is_rostered(session_id)
    )
  );

revoke all on table public.teacher_announcements from public;
grant select, insert, delete on table public.teacher_announcements to authenticated;
grant all on table public.teacher_announcements to service_role;
