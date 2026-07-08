-- Bienestar Iter 4: persist psychologist chat per user (one active session blob).

create table if not exists public.psychologist_chat_sessions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.psychologist_chat_sessions is
  'Last wellbeing chat transcript per user (JSON array of {role, content}). Not clinical record.';

create index if not exists psychologist_chat_sessions_updated_idx
  on public.psychologist_chat_sessions (updated_at desc);

alter table public.psychologist_chat_sessions enable row level security;

drop policy if exists "psychologist_chat_sessions_select_own" on public.psychologist_chat_sessions;
create policy "psychologist_chat_sessions_select_own"
  on public.psychologist_chat_sessions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "psychologist_chat_sessions_insert_own" on public.psychologist_chat_sessions;
create policy "psychologist_chat_sessions_insert_own"
  on public.psychologist_chat_sessions for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "psychologist_chat_sessions_update_own" on public.psychologist_chat_sessions;
create policy "psychologist_chat_sessions_update_own"
  on public.psychologist_chat_sessions for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "psychologist_chat_sessions_delete_own" on public.psychologist_chat_sessions;
create policy "psychologist_chat_sessions_delete_own"
  on public.psychologist_chat_sessions for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.psychologist_chat_sessions from public;
grant select, insert, update, delete on table public.psychologist_chat_sessions to authenticated;
grant all on table public.psychologist_chat_sessions to service_role;
