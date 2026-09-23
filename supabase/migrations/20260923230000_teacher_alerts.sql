-- Panel de alertas del docente: agrega señales de riesgo por estudiante
-- (actividad, trabajos pendientes, promedio reciente). Solo ve los
-- estudiantes que le han enviado trabajos.
create or replace function public.get_teacher_alerts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;

  with students as (
    select s.student_user_id as id,
           max(s.student_display_name) as name
    from public.student_submissions s
    where s.teacher_user_id = auth.uid()
    group by s.student_user_id
  ),
  stats as (
    select
      st.id,
      st.name,
      (select max(d.day) from public.study_days d where d.user_id = st.id) as last_day,
      (select count(*)::integer from public.study_days d
        where d.user_id = st.id and d.day >= current_date - 6) as week_days,
      (select count(*)::integer from public.student_submissions s
        where s.student_user_id = st.id
          and s.teacher_user_id = auth.uid()
          and s.status = 'sent') as pending,
      (select round(avg(s.grade), 1) from public.student_submissions s
        where s.student_user_id = st.id
          and s.teacher_user_id = auth.uid()
          and s.status = 'reviewed'
          and s.grade is not null
          and s.reviewed_at >= now() - interval '30 days') as avg30,
      (select count(*)::integer from public.student_submissions s
        where s.student_user_id = st.id
          and s.teacher_user_id = auth.uid()
          and s.status = 'reviewed'
          and s.reviewed_at >= now() - interval '30 days') as graded30
    from students st
  )
  select jsonb_agg(jsonb_build_object(
    'student_id', id,
    'student_name', name,
    'last_activity_day', last_day,
    'week_days', week_days,
    'pending_works', pending,
    'avg_30d', avg30,
    'graded_30d', graded30
  ) order by coalesce(current_date - last_day, 9999) desc)
  into v_result
  from stats;

  return jsonb_build_object('ok', true, 'students', coalesce(v_result, '[]'::jsonb));
end;
$$;

revoke all on function public.get_teacher_alerts() from public;
grant execute on function public.get_teacher_alerts() to authenticated;
