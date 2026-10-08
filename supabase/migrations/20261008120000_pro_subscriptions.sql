-- Kampus: suscripciones Pro con cobro manual (Pago Móvil / Zelle / Binance).
--
-- APLICAR: pegar este archivo completo en Supabase → SQL Editor → Run.
-- Sin esta tabla, la página /pro muestra "estamos activando el cobro" y no
-- acepta reportes de pago (la app sigue funcionando igual para todos).
--
-- Flujo: el usuario reporta su pago (status='pending') → el admin lo activa
-- desde /admin/pagos (status='active', starts_at/expires_at) → el cron diario
-- degrada a plan free y marca 'expired' cuando vence.

create table if not exists public.pro_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  months integer not null default 1 check (months between 1 and 12),
  amount_usd numeric(10, 2) not null check (amount_usd > 0),
  method text not null check (method in ('pago_movil', 'zelle', 'binance', 'otro')),
  reference text not null,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'rejected', 'expired', 'cancelled')),
  reported_at timestamptz not null default now(),
  starts_at timestamptz,
  expires_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pro_subscriptions_user_idx
  on public.pro_subscriptions (user_id, created_at desc);

create index if not exists pro_subscriptions_status_idx
  on public.pro_subscriptions (status, expires_at);

alter table public.pro_subscriptions enable row level security;

-- El usuario solo ve sus propias suscripciones.
drop policy if exists "pro_subscriptions_select_own" on public.pro_subscriptions;
create policy "pro_subscriptions_select_own"
  on public.pro_subscriptions for select
  using (auth.uid() = user_id);

-- El usuario solo puede reportar pagos propios y siempre como 'pending'
-- (la activación la hace el admin con service role, que salta RLS).
drop policy if exists "pro_subscriptions_insert_own_pending" on public.pro_subscriptions;
create policy "pro_subscriptions_insert_own_pending"
  on public.pro_subscriptions for insert
  with check (auth.uid() = user_id and status = 'pending');

-- Sin update/delete para usuarios comunes.
