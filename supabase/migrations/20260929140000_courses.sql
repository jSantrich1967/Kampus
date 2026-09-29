-- A course is not a live class and does not own notebook files.
-- The teacher creates it. A student sees it only after an enrollment row exists.

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_name_length check (char_length(trim(name)) between 2 and 120),
  constraint courses_status_check check (status in ('active', 'archived'))
);

comment on table public.courses is
  'A course taught by one account. Personal notebooks stay on that person.';

create index if not exists courses_teacher_idx
  on public.courses (teacher_user_id, created_at desc);

create table if not exists public.course_enrollments (
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  primary key (course_id, user_id),
  constraint course_enrollments_status_check check (status in ('active', 'suspended'))
);

comment on table public.course_enrollments is
  'A student seat in one course. The teacher is courses.teacher_user_id, not a row here.';

create index if not exists course_enrollments_user_idx
  on public.course_enrollments (user_id);

create or replace function public.set_course_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
  before update on public.courses
  for each row
  execute function public.set_course_updated_at();

create or replace function public.caller_teaches_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.courses c
    where c.id = p_course_id
      and c.teacher_user_id = auth.uid()
  );
$$;

revoke all on function public.caller_teaches_course(uuid) from public;
revoke all on function public.caller_teaches_course(uuid) from anon;
grant execute on function public.caller_teaches_course(uuid) to authenticated;

alter table public.courses enable row level security;
alter table public.course_enrollments enable row level security;

drop policy if exists "courses_select_participant" on public.courses;
create policy "courses_select_participant"
  on public.courses
  for select
  to authenticated
  using (
    teacher_user_id = auth.uid()
    or (
      status = 'active'
      and exists (
        select 1
        from public.course_enrollments e
        where e.course_id = courses.id
          and e.user_id = auth.uid()
          and e.status = 'active'
      )
    )
  );

drop policy if exists "courses_insert_teacher" on public.courses;
create policy "courses_insert_teacher"
  on public.courses
  for insert
  to authenticated
  with check (
    teacher_user_id = auth.uid()
    and (
      organization_id is null
      or public.caller_organization_role(organization_id) in ('owner', 'admin', 'teacher')
    )
  );

drop policy if exists "courses_update_teacher" on public.courses;
create policy "courses_update_teacher"
  on public.courses
  for update
  to authenticated
  using (teacher_user_id = auth.uid())
  with check (
    teacher_user_id = auth.uid()
    and (
      organization_id is null
      or public.caller_organization_role(organization_id) in ('owner', 'admin', 'teacher')
    )
  );

drop policy if exists "courses_delete_teacher" on public.courses;
create policy "courses_delete_teacher"
  on public.courses
  for delete
  to authenticated
  using (teacher_user_id = auth.uid());

drop policy if exists "course_enrollments_select_own" on public.course_enrollments;
create policy "course_enrollments_select_own"
  on public.course_enrollments
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "course_enrollments_select_teacher" on public.course_enrollments;
create policy "course_enrollments_select_teacher"
  on public.course_enrollments
  for select
  to authenticated
  using (public.caller_teaches_course(course_id));

drop policy if exists "course_enrollments_insert_teacher" on public.course_enrollments;
create policy "course_enrollments_insert_teacher"
  on public.course_enrollments
  for insert
  to authenticated
  with check (
    public.caller_teaches_course(course_id)
    and user_id <> auth.uid()
  );

drop policy if exists "course_enrollments_update_teacher" on public.course_enrollments;
create policy "course_enrollments_update_teacher"
  on public.course_enrollments
  for update
  to authenticated
  using (public.caller_teaches_course(course_id))
  with check (
    public.caller_teaches_course(course_id)
    and user_id <> auth.uid()
  );

revoke all on public.courses from public;
revoke all on public.courses from anon;
revoke all on public.courses from authenticated;
grant select, insert, update, delete on table public.courses to authenticated;
grant all on table public.courses to service_role;

revoke all on public.course_enrollments from public;
revoke all on public.course_enrollments from anon;
revoke all on public.course_enrollments from authenticated;
grant select, insert, update on table public.course_enrollments to authenticated;
grant all on table public.course_enrollments to service_role;
