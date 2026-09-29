-- A short code enrolls the signed-in student. It does not open notebooks or the live class.

alter table public.courses
  add column if not exists join_code text;

create or replace function public.generate_course_join_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i integer;
  n integer;
begin
  loop
    candidate := '';
    for i in 1..8 loop
      n := 1 + floor(random() * char_length(alphabet))::integer;
      candidate := candidate || substr(alphabet, n, 1);
    end loop;
    exit when not exists (select 1 from public.courses where join_code = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.assign_course_join_code()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.join_code is not null then
    new.join_code := old.join_code;
  elsif new.join_code is null or tg_op = 'INSERT' then
    new.join_code := public.generate_course_join_code();
  end if;
  return new;
end;
$$;

drop trigger if exists courses_assign_join_code on public.courses;
create trigger courses_assign_join_code
  before insert or update on public.courses
  for each row
  execute function public.assign_course_join_code();

do $$
declare
  course_row record;
begin
  for course_row in select id from public.courses where join_code is null loop
    update public.courses
    set join_code = public.generate_course_join_code()
    where id = course_row.id
      and join_code is null;
  end loop;
end;
$$;

alter table public.courses
  alter column join_code set not null;

create unique index if not exists courses_join_code_unique
  on public.courses (join_code);

comment on column public.courses.join_code is
  'Class code. The server enrolls the signed-in student. The browser cannot invent the code.';

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
    insert into public.course_enrollments (course_id, user_id, status)
    values (course_row.id, auth.uid(), 'active');
  end if;

  return query select course_row.id, course_row.name, seat = 'active';
end;
$$;

revoke all on function public.generate_course_join_code() from public;
revoke all on function public.generate_course_join_code() from anon;
revoke all on function public.generate_course_join_code() from authenticated;

revoke all on function public.assign_course_join_code() from public;
revoke all on function public.assign_course_join_code() from anon;
revoke all on function public.assign_course_join_code() from authenticated;

revoke all on function public.join_course_by_code(text) from public;
revoke all on function public.join_course_by_code(text) from anon;
grant execute on function public.join_course_by_code(text) to authenticated;
