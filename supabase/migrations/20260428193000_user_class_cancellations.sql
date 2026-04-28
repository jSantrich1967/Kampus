-- Kampus: suspensiones de clase (por fecha) sobre horario semanal fijo + RLS.

create table if not exists public.user_class_cancellations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  schedule_id uuid not null references public.user_class_schedule (id) on delete cascade,
  /** YYYY-MM-DD */
  class_date date not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  constraint user_class_cancellations_unique unique (user_id, schedule_id, class_date)
);

comment on table public.user_class_cancellations is
  'Excepciones por fecha: marca una clase de un horario semanal como suspendida, con justificación.';

create index if not exists user_class_cancellations_user_date_idx
  on public.user_class_cancellations (user_id, class_date desc);

alter table public.user_class_cancellations enable row level security;

drop policy if exists "user_class_cancellations_select_own" on public.user_class_cancellations;
create policy "user_class_cancellations_select_own"
  on public.user_class_cancellations for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_class_cancellations_insert_own" on public.user_class_cancellations;
create policy "user_class_cancellations_insert_own"
  on public.user_class_cancellations for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_class_cancellations_update_own" on public.user_class_cancellations;
create policy "user_class_cancellations_update_own"
  on public.user_class_cancellations for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_class_cancellations_delete_own" on public.user_class_cancellations;
create policy "user_class_cancellations_delete_own"
  on public.user_class_cancellations for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.user_class_cancellations from public;
grant select, insert, update, delete on table public.user_class_cancellations to authenticated;
grant all on table public.user_class_cancellations to service_role;

