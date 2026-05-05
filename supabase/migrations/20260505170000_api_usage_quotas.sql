-- Per-user daily quotas for OpenAI-backed routes (cost control).
-- Run in Supabase SQL Editor for your production project.

create table if not exists public.api_usage_quotas (
  user_id uuid not null references auth.users (id) on delete cascade,
  quota_key text not null,
  quota_day date not null default current_date,
  used_count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, quota_key, quota_day)
);

comment on table public.api_usage_quotas is 'Daily per-user counters for costly APIs (OpenAI).';

create index if not exists api_usage_quotas_user_day_idx
  on public.api_usage_quotas (user_id, quota_day desc);

alter table public.api_usage_quotas enable row level security;

drop policy if exists "api_usage_quotas_select_own" on public.api_usage_quotas;
create policy "api_usage_quotas_select_own"
  on public.api_usage_quotas for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "api_usage_quotas_insert_own" on public.api_usage_quotas;
create policy "api_usage_quotas_insert_own"
  on public.api_usage_quotas for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "api_usage_quotas_update_own" on public.api_usage_quotas;
create policy "api_usage_quotas_update_own"
  on public.api_usage_quotas for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on public.api_usage_quotas from public;
grant select, insert, update on table public.api_usage_quotas to authenticated;
grant all on table public.api_usage_quotas to service_role;

-- Atomic increment and decision in a single call (works with RLS as invoker).
create or replace function public.consume_api_quota(p_quota_key text, p_daily_limit int)
returns table(allowed boolean, used int, daily_limit int, reset_at timestamptz)
language plpgsql
as $$
declare
  uid uuid;
  next_used int;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'unauthenticated';
  end if;

  insert into public.api_usage_quotas (user_id, quota_key, quota_day, used_count)
  values (uid, p_quota_key, current_date, 1)
  on conflict (user_id, quota_key, quota_day)
  do update set used_count = public.api_usage_quotas.used_count + 1,
               updated_at = now()
  returning used_count into next_used;

  allowed := next_used <= greatest(p_daily_limit, 0);
  used := next_used;
  daily_limit := p_daily_limit;
  reset_at := date_trunc('day', now()) + interval '1 day';
  return next;
end;
$$;

grant execute on function public.consume_api_quota(text, int) to authenticated;
grant execute on function public.consume_api_quota(text, int) to service_role;

