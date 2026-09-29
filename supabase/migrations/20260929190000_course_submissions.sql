-- A report can belong to one course. Older rows stay without a course.
-- The class code and the notebook stay out of this table.

alter table public.student_submissions
  add column if not exists course_id uuid references public.courses (id) on delete set null;

comment on column public.student_submissions.course_id is
  'Course that received the report. Null means an older delivery with no course.';

create index if not exists student_submissions_course_idx
  on public.student_submissions (course_id, created_at desc);

create or replace function public.caller_can_submit_to_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.courses c
    join public.course_enrollments e
      on e.course_id = c.id
     and e.user_id = auth.uid()
     and e.status = 'active'
    where c.id = p_course_id
      and c.status = 'active'
      and c.teacher_user_id <> auth.uid()
  );
$$;

revoke all on function public.caller_can_submit_to_course(uuid) from public;
revoke all on function public.caller_can_submit_to_course(uuid) from anon;
revoke all on function public.caller_can_submit_to_course(uuid) from authenticated;
grant execute on function public.caller_can_submit_to_course(uuid) to authenticated;

create or replace function public.stamp_course_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  course_row public.courses%rowtype;
  seat_name text;
  seat_found boolean := false;
begin
  if tg_op = 'UPDATE' then
    new.course_id := old.course_id;
    new.student_user_id := old.student_user_id;
    new.teacher_user_id := old.teacher_user_id;
    new.student_display_name := old.student_display_name;
    new.course := old.course;
    return new;
  end if;

  if new.course_id is null then
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'auth required';
  end if;

  select * into course_row
  from public.courses
  where id = new.course_id;

  if course_row.id is null or course_row.status <> 'active' then
    raise exception 'course not open';
  end if;

  if course_row.teacher_user_id = auth.uid() then
    raise exception 'teacher already owns the course';
  end if;

  select e.display_name into seat_name
  from public.course_enrollments e
  where e.course_id = course_row.id
    and e.user_id = auth.uid()
    and e.status = 'active';
  seat_found := found;

  if not seat_found then
    raise exception 'enrollment not active';
  end if;

  new.student_user_id := auth.uid();
  new.teacher_user_id := course_row.teacher_user_id;
  new.course := left(course_row.name, 120);
  new.student_display_name := left(coalesce(nullif(trim(seat_name), ''), 'Estudiante'), 80);
  select coalesce(nullif(trim(p.body->>'displayName'), ''), 'Profesor')
    into new.teacher_display_name
  from public.profiles p
  where p.id = course_row.teacher_user_id;
  if new.teacher_display_name is null or trim(new.teacher_display_name) = '' then
    new.teacher_display_name := 'Profesor';
  end if;
  return new;
end;
$$;

drop trigger if exists student_submissions_stamp_course on public.student_submissions;
create trigger student_submissions_stamp_course
  before insert or update on public.student_submissions
  for each row
  execute function public.stamp_course_submission();

revoke all on function public.stamp_course_submission() from public;
revoke all on function public.stamp_course_submission() from anon;
revoke all on function public.stamp_course_submission() from authenticated;

drop policy if exists "student_submissions_insert_student" on public.student_submissions;
create policy "student_submissions_insert_student"
  on public.student_submissions
  for insert
  to authenticated
  with check (
    student_user_id = auth.uid()
    and (
      (
        course_id is null
        and public.ts_is_my_teacher(teacher_user_id)
      )
      or (
        course_id is not null
        and public.caller_can_submit_to_course(course_id)
      )
    )
  );
