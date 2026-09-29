-- A student delivers a file to one teacher.
-- The file lives in its own private bucket, not in the personal notebook bucket.

alter table public.student_submissions
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text;

alter table public.student_submissions
  alter column body set default '';

alter table public.student_submissions
  drop constraint if exists student_submissions_has_delivery;
alter table public.student_submissions
  add constraint student_submissions_has_delivery
  check (char_length(trim(body)) > 0 or attachment_path is not null)
  not valid;

alter table public.student_submissions
  drop constraint if exists student_submissions_attachment_owner;
alter table public.student_submissions
  add constraint student_submissions_attachment_owner
  check (
    attachment_path is null
    or split_part(attachment_path, '/', 1) = student_user_id::text
  );

comment on column public.student_submissions.attachment_path is
  'Object path in the student-submissions bucket. The first folder is the student id.';

create or replace function public.keep_submission_file()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() = old.teacher_user_id and auth.uid() is distinct from old.student_user_id then
    new.attachment_path := old.attachment_path;
    new.attachment_name := old.attachment_name;
    new.attachment_mime := old.attachment_mime;
  end if;
  return new;
end;
$$;

drop trigger if exists student_submissions_keep_file on public.student_submissions;
create trigger student_submissions_keep_file
  before update on public.student_submissions
  for each row
  execute function public.keep_submission_file();

revoke all on function public.keep_submission_file() from public;
revoke all on function public.keep_submission_file() from anon;
revoke all on function public.keep_submission_file() from authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('student-submissions', 'student-submissions', false, 20971520)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "student_submissions_files_select_own" on storage.objects;
create policy "student_submissions_files_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'student-submissions'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "student_submissions_files_insert_own" on storage.objects;
create policy "student_submissions_files_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'student-submissions'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "student_submissions_files_delete_own" on storage.objects;
create policy "student_submissions_files_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'student-submissions'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "student_submissions_files_select_teacher" on storage.objects;
create policy "student_submissions_files_select_teacher"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'student-submissions'
    and exists (
      select 1
      from public.student_submissions s
      where s.teacher_user_id = auth.uid()
        and s.student_user_id::text = split_part(storage.objects.name, '/', 1)
        and s.attachment_path = storage.objects.name
    )
  );
