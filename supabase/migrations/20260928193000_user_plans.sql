-- Assigns a billing plan without trusting the profile JSON.
-- No row means Free. Only the service role can change a plan.

create table if not exists public.user_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan_id text not null references public.plans (id),
  updated_at timestamptz not null default now()
);

comment on table public.user_plans is
  'Server-side plan. A settings toggle cannot insert a row.';

alter table public.user_plans enable row level security;

drop policy if exists "user_plans_select_own" on public.user_plans;
create policy "user_plans_select_own"
  on public.user_plans for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.user_plans from public;
revoke all on public.user_plans from anon;
grant select on table public.user_plans to authenticated;
grant all on table public.user_plans to service_role;

create or replace function public.ai_usage_totals(p_day_start timestamptz, p_month_start timestamptz)
returns table (
  daily_requests integer,
  daily_tokens integer,
  monthly_requests integer,
  monthly_tokens integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where created_at >= p_day_start)::integer,
    coalesce(sum(total_tokens) filter (where created_at >= p_day_start), 0)::integer,
    count(*)::integer,
    coalesce(sum(total_tokens), 0)::integer
  from public.ai_usage
  where user_id = auth.uid()
    and created_at >= p_month_start;
$$;

revoke all on function public.ai_usage_totals(timestamptz, timestamptz) from public;
grant execute on function public.ai_usage_totals(timestamptz, timestamptz) to authenticated;
