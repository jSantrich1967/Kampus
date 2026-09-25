-- Institutional contact requests. Only the server (service role) can read or write them.

create table if not exists public.sales_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  institution text not null,
  students text,
  message text not null,
  emailed boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.sales_leads is
  'Contact-form leads. Visitors cannot read this table. The app inserts with the service role.';

alter table public.sales_leads enable row level security;

revoke all on public.sales_leads from public;
revoke all on public.sales_leads from anon;
revoke all on public.sales_leads from authenticated;
grant all on table public.sales_leads to service_role;
