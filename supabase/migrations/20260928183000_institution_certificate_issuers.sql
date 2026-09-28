-- A profile role switch cannot make a certificate institutional.
-- Only a service-role row in this table can. The insert trigger copies that
-- fact onto the certificate. The client cannot choose the flag.

create table if not exists public.institution_certificate_issuers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  institution_key text not null,
  institution_name text not null
);

comment on table public.institution_certificate_issuers is
  'Teachers allowed to issue an institutional certificate. Insert with the service role.';

alter table public.institution_certificate_issuers enable row level security;

revoke all on public.institution_certificate_issuers from public;
revoke all on public.institution_certificate_issuers from anon;
revoke all on public.institution_certificate_issuers from authenticated;
grant all on table public.institution_certificate_issuers to service_role;

alter table public.certificates
  add column if not exists issuer_accredited boolean not null default false;

alter table public.certificates
  add column if not exists institution_name text not null default '';

create or replace function public.stamp_certificate_accreditation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  accredited_name text;
begin
  new.issuer_accredited := false;
  new.institution_name := '';
  if new.issuer_id is not null and (new.owner_id is null or new.issuer_id <> new.owner_id) then
    select i.institution_name
      into accredited_name
    from public.institution_certificate_issuers i
    where i.user_id = new.issuer_id;
    if accredited_name is not null then
      new.issuer_accredited := true;
      new.institution_name := accredited_name;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.stamp_certificate_accreditation() from public;
revoke all on function public.stamp_certificate_accreditation() from anon;
revoke all on function public.stamp_certificate_accreditation() from authenticated;

drop trigger if exists certificates_stamp_accreditation on public.certificates;
create trigger certificates_stamp_accreditation
  before insert on public.certificates
  for each row
  execute function public.stamp_certificate_accreditation();

create or replace function public.caller_may_issue_institution_certificate()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.institution_certificate_issuers i
    where i.user_id = auth.uid()
  );
$$;

revoke all on function public.caller_may_issue_institution_certificate() from public;
grant execute on function public.caller_may_issue_institution_certificate() to authenticated;

-- Return type changes, so replace the lookup function.
drop function if exists public.get_certificate_by_code(text);

create function public.get_certificate_by_code(p_code text)
returns table (
  id uuid,
  code text,
  owner_id uuid,
  issuer_id uuid,
  owner_name text,
  title text,
  detail text,
  issued_at timestamptz,
  issuer_accredited boolean,
  institution_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.code,
    c.owner_id,
    c.issuer_id,
    c.owner_name,
    c.title,
    c.detail,
    c.issued_at,
    c.issuer_accredited,
    c.institution_name
  from public.certificates c
  where c.code = upper(trim(p_code))
  limit 1;
$$;

revoke all on function public.get_certificate_by_code(text) from public;
grant execute on function public.get_certificate_by_code(text) to anon, authenticated;
