-- Colaboración Iter 5: Realtime study rooms, open virtual class enrollment, deadline push opt-in.

alter table public.virtual_class_sessions
  add column if not exists open_enrollment boolean not null default true;

comment on column public.virtual_class_sessions.open_enrollment is
  'When true, authenticated students may self-enroll until capacity is reached.';

drop policy if exists "virtual_class_sessions_select_visible" on public.virtual_class_sessions;
create policy "virtual_class_sessions_select_visible"
  on public.virtual_class_sessions
  for select
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1
      from public.virtual_class_roster r
      where r.session_id = virtual_class_sessions.id
        and r.student_user_id = auth.uid()
    )
    or (
      open_enrollment = true
      and starts_at >= (now() - interval '2 hours')
    )
  );

drop policy if exists "virtual_class_roster_insert_self_open" on public.virtual_class_roster;
create policy "virtual_class_roster_insert_self_open"
  on public.virtual_class_roster
  for insert
  to authenticated
  with check (
    student_user_id = auth.uid()
    and exists (
      select 1
      from public.virtual_class_sessions s
      where s.id = session_id
        and s.open_enrollment = true
        and s.starts_at >= (now() - interval '2 hours')
    )
    and (
      (select count(*)::integer from public.virtual_class_roster r where r.session_id = virtual_class_roster.session_id)
      < (select s.capacity from public.virtual_class_sessions s where s.id = virtual_class_roster.session_id)
    )
  );

create or replace function public.enroll_virtual_class_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity integer;
  v_count integer;
  v_open boolean;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;

  select s.capacity, s.open_enrollment
  into v_capacity, v_open
  from public.virtual_class_sessions s
  where s.id = p_session_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not coalesce(v_open, false) then
    return jsonb_build_object('ok', false, 'error', 'closed');
  end if;

  select count(*)::integer into v_count
  from public.virtual_class_roster r
  where r.session_id = p_session_id;

  if v_count >= v_capacity then
    return jsonb_build_object('ok', false, 'error', 'full');
  end if;

  insert into public.virtual_class_roster (session_id, student_user_id)
  values (p_session_id, auth.uid())
  on conflict (session_id, student_user_id) do nothing;

  return jsonb_build_object('ok', true, 'already_enrolled', false);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'insert_failed');
end;
$$;

revoke all on function public.enroll_virtual_class_session(uuid) from public;
grant execute on function public.enroll_virtual_class_session(uuid) to authenticated;

create table if not exists public.collaborate_deadline_push_opt_in (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.collaborate_deadline_push_opt_in enable row level security;

drop policy if exists "collaborate_deadline_push_opt_in_select_own" on public.collaborate_deadline_push_opt_in;
create policy "collaborate_deadline_push_opt_in_select_own"
  on public.collaborate_deadline_push_opt_in for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "collaborate_deadline_push_opt_in_upsert_own" on public.collaborate_deadline_push_opt_in;
create policy "collaborate_deadline_push_opt_in_insert_own"
  on public.collaborate_deadline_push_opt_in for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "collaborate_deadline_push_opt_in_update_own" on public.collaborate_deadline_push_opt_in;
create policy "collaborate_deadline_push_opt_in_update_own"
  on public.collaborate_deadline_push_opt_in for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on public.collaborate_deadline_push_opt_in from public;
grant select, insert, update on table public.collaborate_deadline_push_opt_in to authenticated;
grant all on table public.collaborate_deadline_push_opt_in to service_role;

create table if not exists public.collaborate_deadline_push_last (
  user_id uuid not null references auth.users (id) on delete cascade,
  sent_date date not null,
  primary key (user_id, sent_date)
);

revoke all on public.collaborate_deadline_push_last from public;
grant all on table public.collaborate_deadline_push_last to service_role;

alter table public.collaborate_study_rooms replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'collaborate_study_rooms'
  ) then
    alter publication supabase_realtime add table public.collaborate_study_rooms;
  end if;
exception
  when others then null;
end $$;
