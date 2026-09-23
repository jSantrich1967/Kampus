-- Kampus: Aula virtual — piezas faltantes en Supabase (columnas, RPCs y políticas).
--
-- CONTEXTO: el proyecto de Supabase tenía las tablas virtual_class_sessions y
-- virtual_class_roster, pero nunca se aplicaron las migraciones de Colaboración
-- que agregan columnas (open_enrollment, recording_url, schedule_row_id,
-- class_date) ni las funciones RPC (bootstrap_virtual_class_demo,
-- enroll_virtual_class_session). Por eso fallaban "Crear clase demo" y la
-- creación manual de sesiones.
--
-- Este script es IDEMPOTENTE y autocontenido: puede ejecutarse varias veces sin
-- daño. Reúne las piezas de 20260701200000_collaborate_iter5.sql,
-- 20260702220000_collaborate_iter9.sql y 20260703120000_virtual_class_bootstrap.sql,
-- manteniendo la corrección anti-recursión de 20260923130000 (funciones
-- SECURITY DEFINER vc_is_rostered / vc_is_creator).
--
-- APLICAR: pegar este archivo completo en Supabase → SQL Editor → Run.

-- ---------------------------------------------------------------------------
-- 0. Funciones auxiliares anti-recursión (por si no se aplicó 20260923130000)
-- ---------------------------------------------------------------------------

create or replace function public.vc_is_rostered(p_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.virtual_class_roster r
    where r.session_id = p_session_id
      and r.student_user_id = auth.uid()
  );
$$;

create or replace function public.vc_is_creator(p_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.virtual_class_sessions s
    where s.id = p_session_id
      and s.created_by = auth.uid()
  );
$$;

revoke all on function public.vc_is_rostered(uuid) from public;
revoke all on function public.vc_is_creator(uuid) from public;
grant execute on function public.vc_is_rostered(uuid) to authenticated;
grant execute on function public.vc_is_creator(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 1. Columnas que el código actual inserta/lee
-- ---------------------------------------------------------------------------

alter table public.virtual_class_sessions
  add column if not exists open_enrollment boolean not null default true;

alter table public.virtual_class_sessions
  add column if not exists recording_url text;

alter table public.virtual_class_sessions
  add column if not exists class_date date;

alter table public.virtual_class_sessions
  add column if not exists schedule_row_id uuid;

-- FK a user_class_schedule solo si esa tabla existe en este proyecto.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'user_class_schedule'
  ) and not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'virtual_class_sessions'
      and constraint_name = 'virtual_class_sessions_schedule_row_id_fkey'
  ) then
    alter table public.virtual_class_sessions
      add constraint virtual_class_sessions_schedule_row_id_fkey
      foreign key (schedule_row_id)
      references public.user_class_schedule (id)
      on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Políticas de virtual_class_sessions (creador + inscrito + inscripción abierta)
-- ---------------------------------------------------------------------------

drop policy if exists "virtual_class_sessions_select_visible" on public.virtual_class_sessions;
create policy "virtual_class_sessions_select_visible"
  on public.virtual_class_sessions
  for select
  to authenticated
  using (
    created_by = auth.uid()
    or public.vc_is_rostered(id)
    or (
      open_enrollment = true
      and starts_at >= (now() - interval '2 hours')
      and starts_at <= (now() + interval '14 days')
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
-- 3. Inscripción del propio estudiante en sesiones con inscripción abierta
--    (el subselect sobre sessions pasa por la política de arriba, que usa
--    funciones SECURITY DEFINER: no hay recursión)
-- ---------------------------------------------------------------------------

drop policy if exists "virtual_class_roster_insert_self_open" on public.virtual_class_roster;
create policy "virtual_class_roster_insert_self_open"
  on public.virtual_class_roster
  for insert
  to authenticated
  with check (
    student_user_id = auth.uid()
    and exists (
      select 1
      from public.virtual_class_sessions s
      where s.id = virtual_class_roster.session_id
        and s.open_enrollment = true
        and s.starts_at >= (now() - interval '2 hours')
        and s.starts_at <= (now() + interval '14 days')
    )
    and (
      select count(*)::integer
      from public.virtual_class_roster r
      where r.session_id = virtual_class_roster.session_id
    ) < (
      select s.capacity
      from public.virtual_class_sessions s
      where s.id = virtual_class_roster.session_id
    )
  );

-- ---------------------------------------------------------------------------
-- 4. RPC: bootstrap_virtual_class_demo (botón "Crear clase demo" del docente)
-- ---------------------------------------------------------------------------

create or replace function public.bootstrap_virtual_class_demo()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  role_text text;
  session_id uuid;
  starts timestamptz;
  ends timestamptz;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;

  select coalesce(body->>'role', '') into role_text
  from public.profiles
  where id = auth.uid();

  if role_text not in ('teacher', 'institution') then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if exists (
    select 1 from public.virtual_class_sessions s
    where s.created_by = auth.uid()
      and s.course = 'Kampus · Clase demo'
      and s.starts_at >= (now() - interval '7 days')
  ) then
    select s.id into session_id
    from public.virtual_class_sessions s
    where s.created_by = auth.uid()
      and s.course = 'Kampus · Clase demo'
    order by s.starts_at desc
    limit 1;

    return jsonb_build_object('ok', true, 'session_id', session_id, 'already_exists', true);
  end if;

  starts := date_trunc('minute', now()) + interval '15 minutes';
  ends := starts + interval '1 hour';

  insert into public.virtual_class_sessions (
    created_by,
    course,
    professor_name,
    topic,
    room_label,
    capacity,
    starts_at,
    ends_at,
    open_enrollment,
    join_url,
    embed_video_url
  )
  values (
    auth.uid(),
    'Kampus · Clase demo',
    coalesce(
      nullif(trim((select body->>'displayName' from public.profiles where id = auth.uid())), ''),
      'Docente demo'
    ),
    'Recorrido del aula virtual: vídeo, breakout, roster, grabación y participación en vivo.',
    'Aula virtual · Demo',
    40,
    starts,
    ends,
    true,
    'https://meet.google.com/new',
    'https://www.youtube.com/watch?v=LXb3EKWsInQ'
  )
  returning id into session_id;

  return jsonb_build_object('ok', true, 'session_id', session_id, 'already_exists', false);
end;
$$;

comment on function public.bootstrap_virtual_class_demo() is
  'Creates (or returns) a sample virtual class session for teachers to explore the hub.';

revoke all on function public.bootstrap_virtual_class_demo() from public;
grant execute on function public.bootstrap_virtual_class_demo() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. RPC: enroll_virtual_class_session (botón "Inscribirme" del estudiante)
-- ---------------------------------------------------------------------------

create or replace function public.enroll_virtual_class_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity integer;
  v_count integer;
  v_open boolean;
  v_starts timestamptz;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;

  select s.capacity, s.open_enrollment, s.starts_at
  into v_capacity, v_open, v_starts
  from public.virtual_class_sessions s
  where s.id = p_session_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not coalesce(v_open, false) then
    return jsonb_build_object('ok', false, 'error', 'closed');
  end if;

  if v_starts > (now() + interval '14 days') or v_starts < (now() - interval '2 hours') then
    return jsonb_build_object('ok', false, 'error', 'outside_window');
  end if;

  select count(*)::integer into v_count
  from public.virtual_class_roster r
  where r.session_id = p_session_id;

  if v_count >= v_capacity then
    return jsonb_build_object('ok', false, 'error', 'full');
  end if;

  insert into public.virtual_class_roster (session_id, student_user_id)
  values (p_session_id, auth.uid())
  on conflict (session_id, student_user_id) do nothing;

  return jsonb_build_object('ok', true, 'already_enrolled', false);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'insert_failed');
end;
$$;

revoke all on function public.enroll_virtual_class_session(uuid) from public;
grant execute on function public.enroll_virtual_class_session(uuid) to authenticated;
