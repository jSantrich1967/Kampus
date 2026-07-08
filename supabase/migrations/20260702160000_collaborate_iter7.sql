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
