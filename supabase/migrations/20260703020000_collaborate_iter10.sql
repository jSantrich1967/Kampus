-- Colaboración Iter 10: asistente IA (app), transcripción de clase, asistencia virtual institucional.

alter table public.virtual_class_sessions
  add column if not exists transcript_text text,
  add column if not exists transcript_updated_at timestamptz;

comment on column public.virtual_class_sessions.transcript_text is
  'Auto-transcription text from uploaded class audio (creator only upload).';
comment on column public.virtual_class_sessions.transcript_updated_at is
  'When transcript_text was last generated or saved.';

create table if not exists public.virtual_class_attendance (
  session_id uuid not null references public.virtual_class_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

comment on table public.virtual_class_attendance is
  'Students/creators mark presence when opening a virtual class session page.';

create index if not exists virtual_class_attendance_session_idx
  on public.virtual_class_attendance (session_id, last_seen_at desc);

alter table public.virtual_class_attendance enable row level security;

drop policy if exists "virtual_class_attendance_select_visible" on public.virtual_class_attendance;
create policy "virtual_class_attendance_select_visible"
  on public.virtual_class_attendance for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.virtual_class_sessions s
      where s.id = session_id and s.created_by = auth.uid()
    )
  );

drop policy if exists "virtual_class_attendance_upsert_self" on public.virtual_class_attendance;
create policy "virtual_class_attendance_upsert_self"
  on public.virtual_class_attendance for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "virtual_class_attendance_update_self" on public.virtual_class_attendance;
create policy "virtual_class_attendance_update_self"
  on public.virtual_class_attendance for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.virtual_class_attendance from public;
grant select, insert, update on table public.virtual_class_attendance to authenticated;
grant all on table public.virtual_class_attendance to service_role;

-- Mark attendance when a user opens an accessible session (security definer).
create or replace function public.mark_virtual_class_attendance(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.virtual_class_sessions s
    where s.id = p_session_id
      and (
        s.created_by = auth.uid()
        or exists (
          select 1 from public.virtual_class_roster r
          where r.session_id = s.id and r.student_user_id = auth.uid()
        )
        or (
          s.open_enrollment = true
          and s.starts_at >= (now() - interval '4 hours')
        )
      )
  ) then
    raise exception 'session not accessible';
  end if;

  insert into public.virtual_class_attendance (session_id, user_id, first_seen_at, last_seen_at)
  values (p_session_id, auth.uid(), now(), now())
  on conflict (session_id, user_id)
  do update set last_seen_at = now();
end;
$$;

comment on function public.mark_virtual_class_attendance(uuid) is
  'Upserts attendance for the current user on a virtual class session they can access.';

revoke all on function public.mark_virtual_class_attendance(uuid) from public;
grant execute on function public.mark_virtual_class_attendance(uuid) to authenticated;

-- Institution / teacher summary of virtual attendance (last 30 days).
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
  where s.starts_at >= (now() - interval '30 days')
  limit 50;

  return result;
end;
$$;

comment on function public.list_institution_virtual_attendance_summary() is
  'Aggregated virtual class attendance for institution or teacher dashboards.';

revoke all on function public.list_institution_virtual_attendance_summary() from public;
grant execute on function public.list_institution_virtual_attendance_summary() to authenticated;
