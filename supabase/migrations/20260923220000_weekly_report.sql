-- Reporte semanal del estudiante: lo puede ver el propio estudiante o un
-- docente que haya recibido trabajos suyos. Sirve para compartir con padres
-- por WhatsApp.
create or replace function public.get_weekly_report(p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean := false;
  v_week_start date := current_date - 6;
  v_study_days integer := 0;
  v_streak integer := 0;
  v_submitted integer := 0;
  v_reviewed integer := 0;
  v_avg numeric := null;
  v_name text := 'Estudiante';
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;

  if auth.uid() = p_student_id then
    v_allowed := true;
  elsif exists (
    select 1 from public.student_submissions s
    where s.student_user_id = p_student_id and s.teacher_user_id = auth.uid()
  ) then
    v_allowed := true;
  end if;

  if not v_allowed then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  -- Días con actividad de estudio en los últimos 7 días.
  select count(*)::integer into v_study_days
  from public.study_days d
  where d.user_id = p_student_id and d.day >= v_week_start;

  -- Racha actual: grupo de días consecutivos más reciente; vale solo si
  -- el día más reciente es hoy o ayer.
  with ordered_days as (
    select d.day, row_number() over (order by d.day desc) as rn
    from public.study_days d
    where d.user_id = p_student_id
  ),
  grouped as (
    select day, (day + (rn - 1)) as grp from ordered_days
  ),
  latest as (
    select grp, max(day) as max_day from grouped group by grp order by max_day desc limit 1
  )
  select count(*)::integer into v_streak
  from grouped g
  where g.grp = (select grp from latest)
    and (select max_day from latest) >= current_date - 1;

  -- Trabajos enviados y corregidos en la semana.
  select count(*)::integer into v_submitted
  from public.student_submissions s
  where s.student_user_id = p_student_id and s.created_at >= v_week_start::timestamptz;

  select count(*)::integer into v_reviewed
  from public.student_submissions s
  where s.student_user_id = p_student_id
    and s.status = 'reviewed'
    and s.reviewed_at >= v_week_start::timestamptz;

  select round(avg(s.grade), 1) into v_avg
  from public.student_submissions s
  where s.student_user_id = p_student_id
    and s.status = 'reviewed'
    and s.grade is not null
    and s.reviewed_at >= v_week_start::timestamptz;

  select coalesce(max(s.student_display_name), 'Estudiante') into v_name
  from public.student_submissions s
  where s.student_user_id = p_student_id;

  return jsonb_build_object(
    'ok', true,
    'student_name', v_name,
    'week_start', v_week_start,
    'week_end', current_date,
    'study_days', v_study_days,
    'streak', coalesce(v_streak, 0),
    'submitted', v_submitted,
    'reviewed', v_reviewed,
    'avg_grade', v_avg
  );
end;
$$;

revoke all on function public.get_weekly_report(uuid) from public;
grant execute on function public.get_weekly_report(uuid) to authenticated;
