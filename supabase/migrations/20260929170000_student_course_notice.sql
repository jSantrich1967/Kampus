-- The student can read their own seat, including a suspended one.
-- They still cannot read the course row, so the class code stays hidden.

create or replace function public.list_my_enrolled_courses()
returns table (
  course_id uuid,
  course_name text,
  organization_name text,
  course_status text,
  seat_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name, o.name, c.status, e.status
  from public.course_enrollments e
  join public.courses c on c.id = e.course_id
  left join public.organizations o on o.id = c.organization_id
  where e.user_id = auth.uid()
    and e.status in ('active', 'suspended');
$$;

revoke all on function public.list_my_enrolled_courses() from public;
revoke all on function public.list_my_enrolled_courses() from anon;
revoke all on function public.list_my_enrolled_courses() from authenticated;
grant execute on function public.list_my_enrolled_courses() to authenticated;
