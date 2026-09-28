-- The screen may ask for a context. The database only stores one the caller belongs to.
-- A null organization_id means Personal. It does not change the personal plan.

create table if not exists public.user_contexts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.user_contexts is
  'Last context the server accepted. Null organization_id is the personal context.';

create index if not exists user_contexts_organization_idx
  on public.user_contexts (organization_id);

create or replace function public.caller_has_active_organization(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and o.status = 'active'
  );
$$;

revoke all on function public.caller_has_active_organization(uuid) from public;
grant execute on function public.caller_has_active_organization(uuid) to authenticated;

create or replace function public.set_user_context_updated_at()
returns trigger
language plpgsql
as $$
begin
  if new.organization_id is not null and not public.caller_has_active_organization(new.organization_id) then
    raise exception 'context organization is not an active membership';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_contexts_set_updated_at on public.user_contexts;
create trigger user_contexts_set_updated_at
  before insert or update on public.user_contexts
  for each row
  execute function public.set_user_context_updated_at();

alter table public.user_contexts enable row level security;

drop policy if exists "user_contexts_select_own" on public.user_contexts;
create policy "user_contexts_select_own"
  on public.user_contexts for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_contexts_insert_own" on public.user_contexts;
create policy "user_contexts_insert_own"
  on public.user_contexts for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (
      organization_id is null
      or public.caller_has_active_organization(organization_id)
    )
  );

drop policy if exists "user_contexts_update_own" on public.user_contexts;
create policy "user_contexts_update_own"
  on public.user_contexts for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      organization_id is null
      or public.caller_has_active_organization(organization_id)
    )
  );

revoke all on public.user_contexts from public;
revoke all on public.user_contexts from anon;
revoke all on public.user_contexts from authenticated;
grant select, insert, update on table public.user_contexts to authenticated;
grant all on table public.user_contexts to service_role;
