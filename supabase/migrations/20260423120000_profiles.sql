-- Campus AI: user profile document (mirrors app UserProfile JSON) + RLS.
-- Apply in Supabase: SQL Editor > New query, or `supabase db push` if you use the CLI.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  body jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Kampus user profile; body matches app UserProfile (validated in TypeScript).';

create index if not exists profiles_updated_at_idx on public.profiles (updated_at desc);

-- Keep updated_at fresh on row change (app may also send updated_at on upsert).
create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profiles_updated_at();

-- One profile row per new auth user (empty body until the app fills it).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, body)
  values (new.id, '{}'::jsonb)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles
  for delete
  to authenticated
  using (auth.uid() = id);

revoke all on public.profiles from public;
grant select, insert, update, delete on table public.profiles to authenticated;
grant all on table public.profiles to service_role;
