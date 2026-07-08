-- Colaboración Iter 11: breakout vídeo en vivo, integración LMS, participación en tiempo real.

alter table public.virtual_class_breakout_rooms
  add column if not exists video_url text;

comment on column public.virtual_class_breakout_rooms.video_url is
  'Optional Meet/Zoom/YouTube link for live video inside the breakout study room.';

alter table public.virtual_class_sessions
  add column if not exists lms_course_id text;

comment on column public.virtual_class_sessions.lms_course_id is
  'External course id in Moodle/Canvas for deep-link from Kampus.';

drop policy if exists "virtual_class_breakout_update_creator" on public.virtual_class_breakout_rooms;
create policy "virtual_class_breakout_update_creator"
  on public.virtual_class_breakout_rooms for update to authenticated
  using (
    exists (
      select 1 from public.virtual_class_sessions s
      where s.id = session_id and s.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.virtual_class_sessions s
      where s.id = session_id and s.created_by = auth.uid()
    )
  );

grant update on table public.virtual_class_breakout_rooms to authenticated;

create table if not exists public.collaborate_lms_integrations (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null check (provider in ('moodle', 'canvas', 'generic')),
  base_url text not null check (char_length(trim(base_url)) > 0),
  updated_at timestamptz not null default now()
);

comment on table public.collaborate_lms_integrations is
  'Per-user LMS base URL (teacher or institution admin) for course deep-links.';

alter table public.collaborate_lms_integrations enable row level security;

drop policy if exists "collaborate_lms_select_own" on public.collaborate_lms_integrations;
create policy "collaborate_lms_select_own"
  on public.collaborate_lms_integrations for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "collaborate_lms_upsert_own" on public.collaborate_lms_integrations;
create policy "collaborate_lms_upsert_own"
  on public.collaborate_lms_integrations for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "collaborate_lms_update_own" on public.collaborate_lms_integrations;
create policy "collaborate_lms_update_own"
  on public.collaborate_lms_integrations for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.collaborate_lms_integrations from public;
grant select, insert, update on table public.collaborate_lms_integrations to authenticated;
grant all on table public.collaborate_lms_integrations to service_role;

create table if not exists public.virtual_class_participation (
  session_id uuid not null references public.virtual_class_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null default '',
  last_active_at timestamptz not null default now(),
  heartbeat_count int not null default 1 check (heartbeat_count >= 1),
  primary key (session_id, user_id)
);

comment on table public.virtual_class_participation is
  'Live participation heartbeats while users stay on a virtual class session page.';

create index if not exists virtual_class_participation_session_active_idx
  on public.virtual_class_participation (session_id, last_active_at desc);

alter table public.virtual_class_participation enable row level security;

drop policy if exists "virtual_class_participation_select_visible" on public.virtual_class_participation;
create policy "virtual_class_participation_select_visible"
  on public.virtual_class_participation for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.virtual_class_sessions s
      where s.id = session_id and s.created_by = auth.uid()
    )
  );

drop policy if exists "virtual_class_participation_insert_self" on public.virtual_class_participation;
create policy "virtual_class_participation_insert_self"
  on public.virtual_class_participation for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "virtual_class_participation_update_self" on public.virtual_class_participation;
create policy "virtual_class_participation_update_self"
  on public.virtual_class_participation for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.virtual_class_participation from public;
grant select, insert, update on table public.virtual_class_participation to authenticated;
grant all on table public.virtual_class_participation to service_role;

alter table public.virtual_class_participation replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'virtual_class_participation'
  ) then
    alter publication supabase_realtime add table public.virtual_class_participation;
  end if;
exception
  when others then null;
end $$;

create or replace function public.upsert_virtual_class_participation(
  p_session_id uuid,
  p_display_name text default ''
)
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

  insert into public.virtual_class_participation (
    session_id, user_id, display_name, last_active_at, heartbeat_count
  )
  values (
    p_session_id,
    auth.uid(),
    coalesce(nullif(trim(p_display_name), ''), 'Estudiante'),
    now(),
    1
  )
  on conflict (session_id, user_id)
  do update set
    display_name = excluded.display_name,
    last_active_at = now(),
    heartbeat_count = virtual_class_participation.heartbeat_count + 1;
end;
$$;

revoke all on function public.upsert_virtual_class_participation(uuid, text) from public;
grant execute on function public.upsert_virtual_class_participation(uuid, text) to authenticated;

create or replace function public.list_virtual_class_participation_live(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.virtual_class_sessions s
    where s.id = p_session_id and s.created_by = auth.uid()
  ) then
    raise exception 'forbidden';
  end if;

  select jsonb_build_object(
    'activeNow', (
      select count(*)::int from public.virtual_class_participation p
      where p.session_id = p_session_id
        and p.last_active_at >= (now() - interval '90 seconds')
    ),
    'totalParticipants', (
      select count(*)::int from public.virtual_class_participation p
      where p.session_id = p_session_id
    ),
    'participants', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'userId', p.user_id,
            'displayName', p.display_name,
            'lastActiveAt', p.last_active_at,
            'heartbeatCount', p.heartbeat_count,
            'activeNow', p.last_active_at >= (now() - interval '90 seconds')
          )
          order by p.last_active_at desc
        )
        from public.virtual_class_participation p
        where p.session_id = p_session_id
      ),
      '[]'::jsonb
    )
  )
  into result;

  return result;
end;
$$;

revoke all on function public.list_virtual_class_participation_live(uuid) from public;
grant execute on function public.list_virtual_class_participation_live(uuid) to authenticated;
