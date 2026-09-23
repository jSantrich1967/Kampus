-- Kampus: Aula virtual — corrección de recursión infinita en las políticas RLS.
--
-- PROBLEMA: "infinite recursion detected in policy for relation 'virtual_class_roster'".
-- La política de SELECT de virtual_class_sessions consultaba directamente la tabla
-- virtual_class_roster, y la política de SELECT de virtual_class_roster consultaba
-- directamente virtual_class_sessions. Postgres entraba en recursión infinita y
-- TODA la lectura del Aula virtual fallaba (el error crudo llegaba a la pantalla).
--
-- SOLUCIÓN: funciones SECURITY DEFINER que verifican pertenencia/creación sin
-- volver a disparar las políticas RLS. Las políticas llaman a las funciones en
-- lugar de consultar las tablas directamente.
--
-- APLICAR: pegar este archivo completo en Supabase → SQL Editor → Run.
-- Seguro de re-ejecutar (drop policy / create or replace).

-- ---------------------------------------------------------------------------
-- Funciones auxiliares (bypass RLS, solo verifican, no exponen datos)
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

comment on function public.vc_is_rostered(uuid) is
  'RLS helper: ¿está auth.uid() inscrito en la sesión? (security definer para romper la recursión)';
comment on function public.vc_is_creator(uuid) is
  'RLS helper: ¿creó auth.uid() la sesión? (security definer para romper la recursión)';

revoke all on function public.vc_is_rostered(uuid) from public;
revoke all on function public.vc_is_creator(uuid) from public;
grant execute on function public.vc_is_rostered(uuid) to authenticated;
grant execute on function public.vc_is_creator(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- virtual_class_sessions: SELECT (creador o inscrito)
-- ---------------------------------------------------------------------------

drop policy if exists "virtual_class_sessions_select_visible" on public.virtual_class_sessions;
create policy "virtual_class_sessions_select_visible"
  on public.virtual_class_sessions
  for select
  to authenticated
  using (
    created_by = auth.uid()
    or public.vc_is_rostered(id)
  );

-- ---------------------------------------------------------------------------
-- virtual_class_roster: SELECT / INSERT / DELETE sin recursión
-- ---------------------------------------------------------------------------

drop policy if exists "virtual_class_roster_select_visible" on public.virtual_class_roster;
create policy "virtual_class_roster_select_visible"
  on public.virtual_class_roster
  for select
  to authenticated
  using (
    student_user_id = auth.uid()
    or public.vc_is_creator(session_id)
  );

drop policy if exists "virtual_class_roster_insert_creator_within_capacity" on public.virtual_class_roster;
create policy "virtual_class_roster_insert_creator_within_capacity"
  on public.virtual_class_roster
  for insert
  to authenticated
  with check (
    public.vc_is_creator(session_id)
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

drop policy if exists "virtual_class_roster_delete_creator_or_self" on public.virtual_class_roster;
create policy "virtual_class_roster_delete_creator_or_self"
  on public.virtual_class_roster
  for delete
  to authenticated
  using (
    student_user_id = auth.uid()
    or public.vc_is_creator(session_id)
  );
