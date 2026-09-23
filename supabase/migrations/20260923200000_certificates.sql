-- Certificados compartibles con código público de verificación.
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  owner_id uuid references auth.users (id) on delete set null,
  issuer_id uuid references auth.users (id) on delete set null,
  owner_name text not null default '',
  title text not null default '',
  detail text not null default '',
  issued_at timestamptz not null default now()
);

create index if not exists certificates_owner_idx on public.certificates (owner_id, issued_at desc);
create index if not exists certificates_issuer_idx on public.certificates (issuer_id, issued_at desc);
create index if not exists certificates_code_idx on public.certificates (code);

alter table public.certificates enable row level security;

-- Verificación pública: cualquiera con el código puede ver el certificado.
drop policy if exists "certificates_public_read" on public.certificates;
create policy "certificates_public_read"
  on public.certificates for select
  using (true);

-- El dueño o el emisor pueden crear.
drop policy if exists "certificates_owner_insert" on public.certificates;
create policy "certificates_owner_insert"
  on public.certificates for insert
  with check (auth.uid() = owner_id or auth.uid() = issuer_id);

-- El dueño o el emisor pueden borrar.
drop policy if exists "certificates_owner_delete" on public.certificates;
create policy "certificates_owner_delete"
  on public.certificates for delete
  using (auth.uid() = owner_id or auth.uid() = issuer_id);
