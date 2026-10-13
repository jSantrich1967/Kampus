-- Repetición espaciada (SM-2) + base para el tablero de dominio por tema.
-- Las tarjetas se registran al generar un kit con "Estudiar con IA".
-- Sin esta tabla todo degrada con elegancia: las rutas devuelven vacío o
-- 503 con mensaje, y el registro de tarjetas se omite en silencio.

create table if not exists public.review_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null,
  topic text not null,
  front text not null,
  back text not null,
  content_hash text not null,
  easiness double precision not null default 2.5,
  interval_days integer not null default 0,
  reps integer not null default 0,
  lapses integer not null default 0,
  next_due timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint review_items_user_hash_unique unique (user_id, content_hash)
);

comment on table public.review_items is
  'Tarjetas para repetición espaciada (SM-2). Se registran al generar un kit; el repaso y la calificación son matemática local sin IA.';

create index if not exists review_items_user_next_due_idx
  on public.review_items (user_id, next_due);

alter table public.review_items enable row level security;

drop policy if exists "review_items_select_own" on public.review_items;
create policy "review_items_select_own"
  on public.review_items for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "review_items_insert_own" on public.review_items;
create policy "review_items_insert_own"
  on public.review_items for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "review_items_update_own" on public.review_items;
create policy "review_items_update_own"
  on public.review_items for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on public.review_items from public;
revoke all on public.review_items from anon;
grant select, insert, update on table public.review_items to authenticated;
grant all on table public.review_items to service_role;
