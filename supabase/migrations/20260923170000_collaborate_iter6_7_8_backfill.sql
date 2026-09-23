-- Backfill: migraciones iter6/7/8 de colaboración nunca aplicadas en producción.
-- Consolida 20260702140000 (iter6), 20260702160000 (iter7), 20260702200000 (iter8).
-- Idempotente: if not exists / drop policy if exists / create or replace.

-- Colaboración Iter 6: study room presence, roster listing RPC, Realtime presence.

create table if not exists public.collaborate_study_room_presence (
  room_code text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null default '',
  last_seen_at timestamptz not null default now(),
  primary key (room_code, user_id)
);

comment on table public.collaborate_study_room_presence is
  'Heartbeat presence for shared study rooms — who is connected (last_seen within ~90s).';

create index if not exists collaborate_study_room_presence_room_seen_idx
  on public.collaborate_study_room_presence (room_code, last_seen_at desc);

alter table public.collaborate_study_room_presence enable row level security;

drop policy if exists "collaborate_study_room_presence_select_auth" on public.collaborate_study_room_presence;
create policy "collaborate_study_room_presence_select_auth"
  on public.collaborate_study_room_presence for select to authenticated
  using (true);

drop policy if exists "collaborate_study_room_presence_insert_own" on public.collaborate_study_room_presence;
create policy "collaborate_study_room_presence_insert_own"
  on public.collaborate_study_room_presence for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "collaborate_study_room_presence_update_own" on public.collaborate_study_room_presence;
create policy "collaborate_study_room_presence_update_own"
  on public.collaborate_study_room_presence for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "collaborate_study_room_presence_delete_own" on public.collaborate_study_room_presence;
create policy "collaborate_study_room_presence_delete_own"
  on public.collaborate_study_room_presence for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.collaborate_study_room_presence from public;
grant select, insert, update, delete on table public.collaborate_study_room_presence to authenticated;
grant all on table public.collaborate_study_room_presence to service_role;

alter table public.collaborate_study_room_presence replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'collaborate_study_room_presence'
  ) then
    alter publication supabase_realtime add table public.collaborate_study_room_presence;
  end if;
exception
  when others then null;
end $$;

-- Creator-only roster list with display names from profiles (security definer).
create or replace function public.list_virtual_class_roster(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;

  if not exists (
    select 1 from public.virtual_class_sessions s
    where s.id = p_session_id and s.created_by = auth.uid()
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  return jsonb_build_object(
    'ok', true,
    'rows', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'student_user_id', r.student_user_id,
            'display_name', coalesce(
              nullif(trim(pr.body->>'displayName'), ''),
              'Estudiante'
            ),
            'joined_at', r.joined_at
          )
          order by r.joined_at asc
        )
        from public.virtual_class_roster r
        left join public.profiles pr on pr.id = r.student_user_id
        where r.session_id = p_session_id
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.list_virtual_class_roster(uuid) from public;
grant execute on function public.list_virtual_class_roster(uuid) to authenticated;
-- Colaboración Iter 7: light chat in study rooms.

create table if not exists public.collaborate_study_room_messages (
  id uuid primary key default gen_random_uuid(),
  room_code text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null default '',
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

comment on table public.collaborate_study_room_messages is
  'Ephemeral chat messages per study room code — last N shown in UI.';

create index if not exists collaborate_study_room_messages_room_created_idx
  on public.collaborate_study_room_messages (room_code, created_at desc);

alter table public.collaborate_study_room_messages enable row level security;

drop policy if exists "collaborate_study_room_messages_select_auth" on public.collaborate_study_room_messages;
create policy "collaborate_study_room_messages_select_auth"
  on public.collaborate_study_room_messages for select to authenticated
  using (true);

drop policy if exists "collaborate_study_room_messages_insert_own" on public.collaborate_study_room_messages;
create policy "collaborate_study_room_messages_insert_own"
  on public.collaborate_study_room_messages for insert to authenticated
  with check (auth.uid() = user_id);

revoke all on public.collaborate_study_room_messages from public;
grant select, insert on table public.collaborate_study_room_messages to authenticated;
grant all on table public.collaborate_study_room_messages to service_role;

alter table public.collaborate_study_room_messages replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'collaborate_study_room_messages'
  ) then
    alter publication supabase_realtime add table public.collaborate_study_room_messages;
  end if;
exception
  when others then null;
end $$;
-- Colaboración Iter 8: roster by email, webcal subscription tokens.

create or replace function public.add_virtual_class_roster_by_email(p_session_id uuid, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student uuid;
  v_capacity integer;
  v_count integer;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;

  if not exists (
    select 1 from public.virtual_class_sessions s
    where s.id = p_session_id and s.created_by = auth.uid()
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select id into v_student
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_student is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select s.capacity into v_capacity
  from public.virtual_class_sessions s
  where s.id = p_session_id;

  select count(*)::integer into v_count
  from public.virtual_class_roster r
  where r.session_id = p_session_id;

  if v_count >= v_capacity then
    return jsonb_build_object('ok', false, 'error', 'full');
  end if;

  if exists (
    select 1 from public.virtual_class_roster r
    where r.session_id = p_session_id and r.student_user_id = v_student
  ) then
    return jsonb_build_object('ok', true, 'already_enrolled', true);
  end if;

  insert into public.virtual_class_roster (session_id, student_user_id)
  values (p_session_id, v_student);

  return jsonb_build_object('ok', true, 'already_enrolled', false);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'insert_failed');
end;
$$;

revoke all on function public.add_virtual_class_roster_by_email(uuid, text) from public;
grant execute on function public.add_virtual_class_roster_by_email(uuid, text) to authenticated;

create table if not exists public.collaborate_webcal_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  rotated_at timestamptz not null default now()
);

comment on table public.collaborate_webcal_tokens is
  'Secret token for subscribed virtual-class .ics feed (webcal URL).';

alter table public.collaborate_webcal_tokens enable row level security;

drop policy if exists "collaborate_webcal_tokens_select_own" on public.collaborate_webcal_tokens;
create policy "collaborate_webcal_tokens_select_own"
  on public.collaborate_webcal_tokens for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "collaborate_webcal_tokens_insert_own" on public.collaborate_webcal_tokens;
create policy "collaborate_webcal_tokens_insert_own"
  on public.collaborate_webcal_tokens for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "collaborate_webcal_tokens_update_own" on public.collaborate_webcal_tokens;
create policy "collaborate_webcal_tokens_update_own"
  on public.collaborate_webcal_tokens for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on public.collaborate_webcal_tokens from public;
grant select, insert, update on table public.collaborate_webcal_tokens to authenticated;
grant all on table public.collaborate_webcal_tokens to service_role;

create or replace function public.resolve_webcal_user_id(p_token text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select user_id
  from public.collaborate_webcal_tokens
  where token = trim(p_token)
  limit 1;
$$;

revoke all on function public.resolve_webcal_user_id(text) from public;
grant execute on function public.resolve_webcal_user_id(text) to service_role;
