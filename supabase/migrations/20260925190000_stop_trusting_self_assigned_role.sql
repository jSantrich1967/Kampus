-- The profile JSON role is chosen by the same account in Settings.
-- Privileged reads must not trust it.

create or replace function public.list_institution_virtual_attendance_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  role_text text;
  result jsonb;
begin
  select coalesce(body->>'role', '') into role_text
  from public.profiles
  where id = auth.uid();

  if role_text not in ('institution', 'teacher') then
    raise exception 'forbidden';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'sessionId', s.id,
        'course', s.course,
        'professorName', s.professor_name,
        'startsAt', s.starts_at,
        'enrolledCount', (
          select count(*)::int from public.virtual_class_roster r where r.session_id = s.id
        ),
        'attendedCount', (
          select count(*)::int from public.virtual_class_attendance a where a.session_id = s.id
        )
      )
      order by s.starts_at desc
    ),
    '[]'::jsonb
  )
  into result
  from public.virtual_class_sessions s
  where s.created_by = auth.uid()
    and s.starts_at >= (now() - interval '30 days')
  limit 50;

  return result;
end;
$$;

comment on function public.list_institution_virtual_attendance_summary() is
  'Attendance totals for virtual classes created by the caller. Does not list other people''s classes.';

-- Who may read an institution pulse. Rows are inserted with the service role, not by the user.
create table if not exists public.institution_readers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  institution_key text not null
);

comment on table public.institution_readers is
  'Server-assigned institution readers. A profile role switch cannot insert a row.';

alter table public.institution_readers enable row level security;

revoke all on public.institution_readers from public;
revoke all on public.institution_readers from anon;
revoke all on public.institution_readers from authenticated;
grant all on table public.institution_readers to service_role;

create or replace function public.caller_may_read_institution(p_institution_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_institution_key is null or length(trim(p_institution_key)) < 2 then
    return false;
  end if;

  return exists (
    select 1
    from public.institution_readers r
    where r.user_id = auth.uid()
      and r.institution_key = p_institution_key
  );
end;
$$;

-- Public certificate lookup is one known code, not the whole table.
drop policy if exists "certificates_public_read" on public.certificates;

drop policy if exists "certificates_owner_read" on public.certificates;
create policy "certificates_owner_read"
  on public.certificates for select
  to authenticated
  using (auth.uid() = owner_id or auth.uid() = issuer_id);

create or replace function public.get_certificate_by_code(p_code text)
returns table (
  id uuid,
  code text,
  owner_id uuid,
  issuer_id uuid,
  owner_name text,
  title text,
  detail text,
  issued_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.code,
    c.owner_id,
    c.issuer_id,
    c.owner_name,
    c.title,
    c.detail,
    c.issued_at
  from public.certificates c
  where c.code = upper(trim(p_code))
  limit 1;
$$;

revoke all on function public.get_certificate_by_code(text) from public;
grant execute on function public.get_certificate_by_code(text) to anon, authenticated;

-- Last deadline-push day is server bookkeeping. Visitors and signed-in users cannot read it.
-- Some projects never applied the migration that creates this table.
create table if not exists public.collaborate_deadline_push_last (
  user_id uuid not null references auth.users (id) on delete cascade,
  sent_date date not null,
  primary key (user_id, sent_date)
);

alter table public.collaborate_deadline_push_last enable row level security;

revoke all on public.collaborate_deadline_push_last from public;
revoke all on public.collaborate_deadline_push_last from anon;
revoke all on public.collaborate_deadline_push_last from authenticated;
grant all on table public.collaborate_deadline_push_last to service_role;
