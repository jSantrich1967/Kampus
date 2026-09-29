-- An archived course stays archived. Returning a seat cannot reopen it.

create or replace function public.keep_archived_course()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'archived' then
    new.status := 'archived';
  end if;
  return new;
end;
$$;

drop trigger if exists courses_keep_archived on public.courses;
create trigger courses_keep_archived
  before update on public.courses
  for each row
  execute function public.keep_archived_course();

revoke all on function public.keep_archived_course() from public;
revoke all on function public.keep_archived_course() from anon;
revoke all on function public.keep_archived_course() from authenticated;
