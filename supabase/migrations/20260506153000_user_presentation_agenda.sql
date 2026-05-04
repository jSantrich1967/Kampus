-- Fix: tabla user_presentation_agenda + RLS (si verify_production.sql dice NO EXISTE).
-- Seguro si ya existe (IF NOT EXISTS / drop policy if exists).
-- Ejecuta este archivo entero en Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- user_presentation_agenda: título + fecha para calendario
-- ---------------------------------------------------------------------------
create table if not exists public.user_presentation_agenda (
  user_id uuid primary key references auth.users (id) on delete cascade,
  deck_title text not null default '',
  presentation_due_date date,
  updated_at timestamptz not null default now()
);

comment on table public.user_presentation_agenda is 'Sincroniza título y fecha de exposición con el calendario entre dispositivos.';

create or replace function public.set_user_presentation_agenda_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_presentation_agenda_set_updated_at on public.user_presentation_agenda;
create trigger user_presentation_agenda_set_updated_at
  before update on public.user_presentation_agenda
  for each row execute procedure public.set_user_presentation_agenda_updated_at();

alter table public.user_presentation_agenda enable row level security;

drop policy if exists "user_presentation_agenda_select_own" on public.user_presentation_agenda;
create policy "user_presentation_agenda_select_own"
  on public.user_presentation_agenda for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_presentation_agenda_insert_own" on public.user_presentation_agenda;
create policy "user_presentation_agenda_insert_own"
  on public.user_presentation_agenda for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_presentation_agenda_update_own" on public.user_presentation_agenda;
create policy "user_presentation_agenda_update_own"
  on public.user_presentation_agenda for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_presentation_agenda_delete_own" on public.user_presentation_agenda;
create policy "user_presentation_agenda_delete_own"
  on public.user_presentation_agenda for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.user_presentation_agenda from public;
grant select, insert, update, delete on table public.user_presentation_agenda to authenticated;
grant all on public.user_presentation_agenda to service_role;
