-- Diario personal por usuario (sincroniza con Mi Diario cuando hay sesión).
-- El contenido sensible va en `payload` (JSON). No es cifrado extremo-a-extremo: protege RLS por usuario.

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.diary_entries is 'Entradas del diario de bienestar; payload = mood, energy, gratitude, body, etc.';

create index if not exists diary_entries_user_entry_date_idx on public.diary_entries (user_id, entry_date desc);
create index if not exists diary_entries_user_created_idx on public.diary_entries (user_id, created_at desc);

alter table public.diary_entries enable row level security;

drop policy if exists "diary_entries_select_own" on public.diary_entries;
create policy "diary_entries_select_own"
  on public.diary_entries for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "diary_entries_insert_own" on public.diary_entries;
create policy "diary_entries_insert_own"
  on public.diary_entries for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "diary_entries_update_own" on public.diary_entries;
create policy "diary_entries_update_own"
  on public.diary_entries for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "diary_entries_delete_own" on public.diary_entries;
create policy "diary_entries_delete_own"
  on public.diary_entries for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.diary_entries from public;
grant select, insert, update, delete on table public.diary_entries to authenticated;
grant all on table public.diary_entries to service_role;
