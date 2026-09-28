-- Generating a teaching exam is not granted by the role saved in the profile.
-- Rows are inserted with the service role.

create table if not exists public.exam_generator_authors (
  user_id uuid primary key references auth.users (id) on delete cascade
);

comment on table public.exam_generator_authors is
  'Accounts allowed to call the teaching exam generator. A settings role switch cannot insert a row.';

alter table public.exam_generator_authors enable row level security;

revoke all on public.exam_generator_authors from public;
revoke all on public.exam_generator_authors from anon;
revoke all on public.exam_generator_authors from authenticated;
grant all on table public.exam_generator_authors to service_role;

create or replace function public.may_generate_teaching_exam()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.exam_generator_authors a
    where a.user_id = auth.uid()
  );
$$;

revoke all on function public.may_generate_teaching_exam() from public;
grant execute on function public.may_generate_teaching_exam() to authenticated;
