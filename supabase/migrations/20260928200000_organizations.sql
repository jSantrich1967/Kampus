-- One account can belong to many institutions.
-- The profile role switch cannot insert a membership. Only the service role can.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  type text not null,
  logo_url text,
  country text not null default 'VE',
  state text not null default '',
  city text not null default '',
  contact_name text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_length check (char_length(trim(name)) between 2 and 160),
  constraint organizations_slug_unique unique (slug),
  constraint organizations_slug_shape check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 2 and 80),
  constraint organizations_type_check check (
    type in (
      'university',
      'school',
      'academy',
      'institute',
      'independent_teacher',
      'education_company',
      'other'
    )
  ),
  constraint organizations_status_check check (status in ('active', 'suspended'))
);

comment on table public.organizations is
  'A school, university, academy, or teacher who contracts Kampus. Not a second user account.';

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  constraint organization_members_role_check check (role in ('owner', 'admin', 'teacher', 'student')),
  constraint organization_members_status_check check (status in ('active', 'suspended'))
);

comment on table public.organization_members is
  'Membership is separate from profiles.role. Kampus staff use the service role, not a member role.';

create index if not exists organization_members_user_idx
  on public.organization_members (user_id);

create or replace function public.set_organization_updated_at()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or length(trim(new.slug)) = 0 then
    new.slug := public.normalize_institution_slug(new.name);
  else
    new.slug := public.normalize_institution_slug(new.slug);
  end if;
  if new.slug is null or char_length(new.slug) < 2 then
    raise exception 'invalid organization slug';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
  before insert or update on public.organizations
  for each row
  execute function public.set_organization_updated_at();

create or replace function public.set_organization_member_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists organization_members_set_updated_at on public.organization_members;
create trigger organization_members_set_updated_at
  before update on public.organization_members
  for each row
  execute function public.set_organization_member_updated_at();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

drop policy if exists "organizations_select_member" on public.organizations;
create policy "organizations_select_member"
  on public.organizations for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members m
      where m.organization_id = organizations.id
        and m.user_id = auth.uid()
    )
  );

-- Reads membership without row level security, so the staff policy cannot recurse.
create or replace function public.caller_is_organization_staff(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members staff
    where staff.organization_id = p_organization_id
      and staff.user_id = auth.uid()
      and staff.status = 'active'
      and staff.role in ('owner', 'admin', 'teacher')
  );
$$;

revoke all on function public.caller_is_organization_staff(uuid) from public;
grant execute on function public.caller_is_organization_staff(uuid) to authenticated;

drop policy if exists "organization_members_select_own" on public.organization_members;
create policy "organization_members_select_own"
  on public.organization_members for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "organization_members_select_staff" on public.organization_members;
create policy "organization_members_select_staff"
  on public.organization_members for select
  to authenticated
  using (public.caller_is_organization_staff(organization_id));

revoke all on public.organizations from public;
revoke all on public.organizations from anon;
revoke all on public.organizations from authenticated;
grant select on table public.organizations to authenticated;
grant all on table public.organizations to service_role;

revoke all on public.organization_members from public;
revoke all on public.organization_members from anon;
revoke all on public.organization_members from authenticated;
grant select on table public.organization_members to authenticated;
grant all on table public.organization_members to service_role;

create or replace function public.caller_organization_role(p_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.organization_members m
  where m.organization_id = p_organization_id
    and m.user_id = auth.uid()
    and m.status = 'active'
  limit 1;
$$;

revoke all on function public.caller_organization_role(uuid) from public;
grant execute on function public.caller_organization_role(uuid) to authenticated;
