-- Aula virtual: bootstrap de sesión demo para docentes/institución (primer uso).

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

-- Show open-enrollment sessions starting within the next 14 days (not only 2h after start).
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
    or (
      open_enrollment = true
      and starts_at >= (now() - interval '2 hours')
      and starts_at <= (now() + interval '14 days')
    )
  );

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
      where s.id = session_id
        and s.open_enrollment = true
        and s.starts_at >= (now() - interval '2 hours')
        and s.starts_at <= (now() + interval '14 days')
    )
    and (
      (select count(*)::integer from public.virtual_class_roster r where r.session_id = virtual_class_roster.session_id)
      < (select s.capacity from public.virtual_class_sessions s where s.id = virtual_class_roster.session_id)
    )
  );

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
