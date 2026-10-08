-- Kampus: comprobantes de pago Pro (captura del Pago Móvil / Zelle).
--
-- APLICAR: pegar este archivo completo en Supabase → SQL Editor → Run.
-- Sin esto, el reporte de pago funciona igual, solo sin adjuntar captura
-- (el campo receipt_path queda vacío y la subida falla sin bloquear nada).

alter table public.pro_subscriptions
  add column if not exists receipt_path text;

insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', false)
on conflict (id) do nothing;

-- Cada usuario sube solo dentro de su carpeta (<user_id>/archivo).
drop policy if exists "payment_receipts_insert_own" on storage.objects;
create policy "payment_receipts_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'payment-receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Cada usuario puede leer sus propios comprobantes; el admin usa service role.
drop policy if exists "payment_receipts_select_own" on storage.objects;
create policy "payment_receipts_select_own"
  on storage.objects for select
  using (
    bucket_id = 'payment-receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
