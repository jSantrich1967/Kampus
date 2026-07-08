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
