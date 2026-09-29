-- The seat remembers the name from the moment the student joined.
-- The teacher can suspend that seat. The course stays.

alter table public.course_enrollments
  add column if not exists display_name text not null default 'Estudiante';

comment on column public.course_enrollments.display_name is
  'Name copied at join time. The teacher does not read the student profile.';

update public.course_enrollments e
set display_name = coalesce(nullif(trim(p.body->>'displayName'), ''), 'Estudiante')
from public.profiles p
where p.id = e.user_id
  and e.display_name = 'Estudiante';

create or replace function public.keep_enrollment_identity()
returns trigger
language plpgsql
as $$
begin
  new.course_id := old.course_id;
  new.user_id := old.user_id;
  new.display_name := old.display_name;
  if new.status not in ('active', 'suspended') then
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists course_enrollments_keep_identity on public.course_enrollments;
create trigger course_enrollments_keep_identity
  before update on public.course_enrollments
  for each row
  execute function public.keep_enrollment_identity();

revoke all on function public.keep_enrollment_identity() from public;
revoke all on function public.keep_enrollment_identity() from anon;
revoke all on function public.keep_enrollment_identity() from authenticated;

create or replace function public.join_course_by_code(p_code text)
returns table (course_id uuid, course_name text, already boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := upper(trim(coalesce(p_code, '')));
  course_row public.courses%rowtype;
  seat text;
  student_name text := 'Estudiante';
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;

  select * into course_row
  from public.courses
  where join_code = normalized
    and status = 'active';

  if course_row.id is null then
    raise exception 'invalid course code';
  end if;

  if course_row.teacher_user_id = auth.uid() then
    raise exception 'teacher already owns the course';
  end if;

  select e.status into seat
  from public.course_enrollments e
  where e.course_id = course_row.id
    and e.user_id = auth.uid();

  if seat = 'suspended' then
    raise exception 'enrollment suspended';
  end if;

  if seat is null then
    select coalesce(nullif(trim(p.body->>'displayName'), ''), 'Estudiante')
    into student_name
    from public.profiles p
    where p.id = auth.uid();

    if student_name is null or char_length(trim(student_name)) = 0 then
      student_name := 'Estudiante';
    end if;

    insert into public.course_enrollments (course_id, user_id, status, display_name)
    values (course_row.id, auth.uid(), 'active', left(student_name, 80));
  end if;

  return query select course_row.id, course_row.name, seat = 'active';
end;
$$;

revoke all on function public.join_course_by_code(text) from public;
revoke all on function public.join_course_by_code(text) from anon;
grant execute on function public.join_course_by_code(text) to authenticated;
