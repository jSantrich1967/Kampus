-- A student must not store another account in issuer_id.
-- Self-declaration: the caller is the owner and there is no issuer.
-- Accreditation: the caller is the issuer, and they are not also the owner.

drop policy if exists "certificates_owner_insert" on public.certificates;
drop policy if exists "certificates_self_declare_insert" on public.certificates;
drop policy if exists "certificates_accredited_insert" on public.certificates;

create policy "certificates_self_declare_insert"
  on public.certificates
  for insert
  to authenticated
  with check (
    auth.uid() = owner_id
    and issuer_id is null
  );

create policy "certificates_accredited_insert"
  on public.certificates
  for insert
  to authenticated
  with check (
    auth.uid() = issuer_id
    and (owner_id is null or owner_id <> auth.uid())
  );
