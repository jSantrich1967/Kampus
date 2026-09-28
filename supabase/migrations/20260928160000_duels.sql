-- Duelos de quiz: retos asíncronos entre estudiantes.
-- Ejecutar en Supabase SQL Editor (una sola vez).

create table if not exists public.duels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  subject text not null,
  topic text not null default '',
  questions jsonb not null,
  creator_id uuid not null references auth.users (id),
  creator_name text not null default 'Jugador 1',
  creator_score integer,
  creator_time_ms integer,
  challenger_id uuid references auth.users (id),
  challenger_name text,
  challenger_score integer,
  challenger_time_ms integer,
  status text not null default 'waiting' check (status in ('waiting', 'done')),
  created_at timestamptz not null default now()
);

alter table public.duels enable row level security;

-- Cualquiera con el código puede ver el duelo (el código es el secreto).
drop policy if exists "duels_read_by_code" on public.duels;
create policy "duels_read_by_code"
  on public.duels for select
  using (true);

-- Solo autenticados pueden crear.
drop policy if exists "duels_insert_auth" on public.duels;
create policy "duels_insert_auth"
  on public.duels for insert
  with check (auth.uid() = creator_id);

-- El creador actualiza sus campos; el retador los suyos al jugar.
drop policy if exists "duels_update_own" on public.duels;
create policy "duels_update_own"
  on public.duels for update
  using (auth.uid() = creator_id or auth.uid() = challenger_id or challenger_id is null)
  with check (auth.uid() = creator_id or auth.uid() = challenger_id or challenger_id is null);

create index if not exists duels_code_idx on public.duels (code);
create index if not exists duels_creator_idx on public.duels (creator_id);
