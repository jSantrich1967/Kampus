-- Kampus: varias exposiciones (decks) por usuario; estado completo en JSONB + título/fecha para el calendario.

create table if not exists public.user_presentation_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  deck_title text not null default '',
  presentation_due_date date,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_presentation_decks is 'Planificador de exposiciones: varias por usuario; state es el JSON del plan (equipo, secciones, guiones, etc.).';

create index if not exists user_presentation_decks_user_updated_idx
  on public.user_presentation_decks (user_id, updated_at desc);

create index if not exists user_presentation_decks_user_due_idx
  on public.user_presentation_decks (user_id, presentation_due_date);

create or replace function public.set_user_presentation_decks_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_presentation_decks_set_updated_at on public.user_presentation_decks;
create trigger user_presentation_decks_set_updated_at
  before update on public.user_presentation_decks
  for each row execute function public.set_user_presentation_decks_updated_at();

alter table public.user_presentation_decks enable row level security;

drop policy if exists "user_presentation_decks_select_own" on public.user_presentation_decks;
create policy "user_presentation_decks_select_own"
  on public.user_presentation_decks for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_presentation_decks_insert_own" on public.user_presentation_decks;
create policy "user_presentation_decks_insert_own"
  on public.user_presentation_decks for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_presentation_decks_update_own" on public.user_presentation_decks;
create policy "user_presentation_decks_update_own"
  on public.user_presentation_decks for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_presentation_decks_delete_own" on public.user_presentation_decks;
create policy "user_presentation_decks_delete_own"
  on public.user_presentation_decks for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.user_presentation_decks from public;
grant select, insert, update, delete on table public.user_presentation_decks to authenticated;
grant all on table public.user_presentation_decks to service_role;

-- Migrar fila única antigua (si existía) a un deck; luego eliminar tabla legacy.
insert into public.user_presentation_decks (user_id, deck_title, presentation_due_date, state)
select
  a.user_id,
  coalesce(nullif(trim(a.deck_title), ''), ''),
  a.presentation_due_date,
  '{}'::jsonb
from public.user_presentation_agenda a
where trim(coalesce(a.deck_title, '')) <> '' or a.presentation_due_date is not null;

drop table if exists public.user_presentation_agenda;
