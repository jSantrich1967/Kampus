-- Colaboración Iter 8: roster by email, webcal subscription tokens.

create or replace function public.add_virtual_class_roster_by_email(p_session_id uuid, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student uuid;
  v_capacity integer;
  v_count integer;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;

  if not exists (
    select 1 from public.virtual_class_sessions s
    where s.id = p_session_id and s.created_by = auth.uid()
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select id into v_student
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_student is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select s.capacity into v_capacity
  from public.virtual_class_sessions s
  where s.id = p_session_id;

  select count(*)::integer into v_count
  from public.virtual_class_roster r
  where r.session_id = p_session_id;

  if v_count >= v_capacity then
    return jsonb_build_object('ok', false, 'error', 'full');
  end if;

  if exists (
    select 1 from public.virtual_class_roster r
    where r.session_id = p_session_id and r.student_user_id = v_student
  ) then
    return jsonb_build_object('ok', true, 'already_enrolled', true);
  end if;

  insert into public.virtual_class_roster (session_id, student_user_id)
  values (p_session_id, v_student);

  return jsonb_build_object('ok', true, 'already_enrolled', false);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'insert_failed');
end;
$$;

revoke all on function public.add_virtual_class_roster_by_email(uuid, text) from public;
grant execute on function public.add_virtual_class_roster_by_email(uuid, text) to authenticated;

create table if not exists public.collaborate_webcal_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  rotated_at timestamptz not null default now()
);

comment on table public.collaborate_webcal_tokens is
  'Secret token for subscribed virtual-class .ics feed (webcal URL).';

alter table public.collaborate_webcal_tokens enable row level security;

drop policy if exists "collaborate_webcal_tokens_select_own" on public.collaborate_webcal_tokens;
create policy "collaborate_webcal_tokens_select_own"
  on public.collaborate_webcal_tokens for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "collaborate_webcal_tokens_insert_own" on public.collaborate_webcal_tokens;
create policy "collaborate_webcal_tokens_insert_own"
  on public.collaborate_webcal_tokens for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "collaborate_webcal_tokens_update_own" on public.collaborate_webcal_tokens;
create policy "collaborate_webcal_tokens_update_own"
  on public.collaborate_webcal_tokens for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on public.collaborate_webcal_tokens from public;
grant select, insert, update on table public.collaborate_webcal_tokens to authenticated;
grant all on table public.collaborate_webcal_tokens to service_role;

create or replace function public.resolve_webcal_user_id(p_token text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select user_id
  from public.collaborate_webcal_tokens
  where token = trim(p_token)
  limit 1;
$$;

revoke all on function public.resolve_webcal_user_id(text) from public;
grant execute on function public.resolve_webcal_user_id(text) to service_role;
