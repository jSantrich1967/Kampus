-- Fix: enroll_virtual_class_session reportaba already_enrolled=false incluso
-- cuando el usuario ya estaba inscrito (el INSERT ... ON CONFLICT DO NOTHING
-- no distinguía). El frontend suma +1 al contador cuando already_enrolled es
-- false, así que cada visita de un inscrito inflaba el número mostrado
-- (ej.: mostraba 2 inscritos con 1 fila real en la lista).
-- Ahora detecta la inscripción existente antes de insertar y la reporta bien.

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

  -- Ya inscrito: no insertar y reportarlo correctamente (antes devolvía false).
  if exists (
    select 1 from public.virtual_class_roster r
    where r.session_id = p_session_id and r.student_user_id = auth.uid()
  ) then
    return jsonb_build_object('ok', true, 'already_enrolled', true);
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
