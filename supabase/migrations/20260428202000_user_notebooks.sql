-- Kampus: cuadernos por materia (vacíos al inicio) + RLS.
-- Antes, el “cuaderno” existía solo si había archivos en notebook_documents.
-- Con esta tabla se puede “Crear cuaderno” una sola vez y luego ir agregando clases/material.

create table if not exists public.user_notebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_notebooks_user_subject_unique unique (user_id, subject)
);

comment on table public.user_notebooks is 'Un cuaderno por materia, aunque esté vacío (sin archivos).';

create index if not exists user_notebooks_user_subject_idx
  on public.user_notebooks (user_id, subject);

create or replace function public.set_user_notebooks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_notebooks_set_updated_at on public.user_notebooks;
create trigger user_notebooks_set_updated_at
  before update on public.user_notebooks
  for each row
  execute function public.set_user_notebooks_updated_at();

alter table public.user_notebooks enable row level security;

drop policy if exists "user_notebooks_select_own" on public.user_notebooks;
create policy "user_notebooks_select_own"
  on public.user_notebooks for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_notebooks_insert_own" on public.user_notebooks;
create policy "user_notebooks_insert_own"
  on public.user_notebooks for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_notebooks_update_own" on public.user_notebooks;
create policy "user_notebooks_update_own"
  on public.user_notebooks for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_notebooks_delete_own" on public.user_notebooks;
create policy "user_notebooks_delete_own"
  on public.user_notebooks for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.user_notebooks from public;
grant select, insert, update, delete on table public.user_notebooks to authenticated;
grant all on table public.user_notebooks to service_role;

