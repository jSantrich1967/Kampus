-- Institutional AI caps. Limits stay on plans. A settings button cannot insert a seat.
-- The browser cannot read contracts. Only the service role writes.

create table if not exists public.organization_licenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  plan_id text not null references public.plans (id),
  seat_limit integer not null,
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_licenses_seat_limit_check check (seat_limit >= 0),
  constraint organization_licenses_status_check check (status in ('active', 'expired', 'suspended')),
  constraint organization_licenses_window_check check (ends_at is null or ends_at > starts_at)
);

comment on table public.organization_licenses is
  'Contracted plan for one institution. Numbers live on plans, not in the app.';

create unique index if not exists organization_licenses_one_active
  on public.organization_licenses (organization_id)
  where status = 'active';

create table if not exists public.organization_license_seats (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  license_id uuid not null references public.organization_licenses (id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  constraint organization_license_seats_status_check check (status in ('active', 'revoked'))
);

comment on table public.organization_license_seats is
  'One active seat uses the institution plan. No seat keeps the personal plan.';

create index if not exists organization_license_seats_license_idx
  on public.organization_license_seats (license_id);

create or replace function public.enforce_license_seat_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap integer;
  used integer;
begin
  if new.status <> 'active' then
    return new;
  end if;

  select seat_limit into cap
  from public.organization_licenses
  where id = new.license_id
    and organization_id = new.organization_id
    and status = 'active'
    and starts_at <= now()
    and (ends_at is null or ends_at > now());

  if cap is null then
    raise exception 'license is not active';
  end if;

  select count(*) into used
  from public.organization_license_seats
  where license_id = new.license_id
    and status = 'active'
    and user_id <> new.user_id;

  if used >= cap then
    raise exception 'license seat limit reached';
  end if;

  return new;
end;
$$;

drop trigger if exists organization_license_seats_cap on public.organization_license_seats;
create trigger organization_license_seats_cap
  before insert or update on public.organization_license_seats
  for each row
  execute function public.enforce_license_seat_cap();

alter table public.organization_licenses enable row level security;
alter table public.organization_license_seats enable row level security;

revoke all on public.organization_licenses from public;
revoke all on public.organization_licenses from anon;
revoke all on public.organization_licenses from authenticated;
grant all on table public.organization_licenses to service_role;

revoke all on public.organization_license_seats from public;
revoke all on public.organization_license_seats from anon;
revoke all on public.organization_license_seats from authenticated;
grant all on table public.organization_license_seats to service_role;

revoke all on function public.enforce_license_seat_cap() from public;
revoke all on function public.enforce_license_seat_cap() from anon;
revoke all on function public.enforce_license_seat_cap() from authenticated;
