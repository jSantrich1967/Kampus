-- Kampus: student notebooks per subject (Storage + metadata) + RLS.
-- Run via Supabase CLI or SQL Editor after profiles migration.

-- ---------------------------------------------------------------------------
-- Table: one row per uploaded file (path points to Storage object)
-- ---------------------------------------------------------------------------
create table if not exists public.notebook_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null,
  storage_path text not null,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  extracted_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notebook_documents_user_path_unique unique (user_id, storage_path)
);

comment on table public.notebook_documents is 'User-owned study files grouped by subject; binary lives in Storage bucket notebooks.';

create index if not exists notebook_documents_user_subject_idx
  on public.notebook_documents (user_id, subject);

create index if not exists notebook_documents_user_created_idx
  on public.notebook_documents (user_id, created_at desc);

create or replace function public.set_notebook_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notebook_documents_set_updated_at on public.notebook_documents;
create trigger notebook_documents_set_updated_at
  before update on public.notebook_documents
  for each row
  execute function public.set_notebook_documents_updated_at();

alter table public.notebook_documents enable row level security;

drop policy if exists "notebook_documents_select_own" on public.notebook_documents;
create policy "notebook_documents_select_own"
  on public.notebook_documents
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "notebook_documents_insert_own" on public.notebook_documents;
create policy "notebook_documents_insert_own"
  on public.notebook_documents
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "notebook_documents_update_own" on public.notebook_documents;
create policy "notebook_documents_update_own"
  on public.notebook_documents
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "notebook_documents_delete_own" on public.notebook_documents;
create policy "notebook_documents_delete_own"
  on public.notebook_documents
  for delete
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.notebook_documents from public;
grant select, insert, update, delete on table public.notebook_documents to authenticated;
grant all on table public.notebook_documents to service_role;

-- ---------------------------------------------------------------------------
-- Storage: private bucket; object path must start with auth uid (first folder)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('notebooks', 'notebooks', false, 52428800)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "notebooks_select_own" on storage.objects;
create policy "notebooks_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'notebooks'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "notebooks_insert_own" on storage.objects;
create policy "notebooks_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'notebooks'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "notebooks_update_own" on storage.objects;
create policy "notebooks_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'notebooks'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'notebooks'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "notebooks_delete_own" on storage.objects;
create policy "notebooks_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'notebooks'
    and split_part(name, '/', 1) = auth.uid()::text
  );
