-- Observaciones de mejora de los usuarios + administradores de la app.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null default 'sugerencia',
  message text not null,
  page text,
  status text not null default 'nueva',
  created_at timestamptz not null default now(),
  constraint feedback_category_check check (category in ('error', 'sugerencia', 'mejora', 'otro')),
  constraint feedback_status_check check (status in ('nueva', 'revisada', 'aplicada', 'descartada')),
  constraint feedback_message_check check (char_length(message) between 1 and 2000)
);

create index if not exists feedback_user_idx on public.feedback (user_id, created_at desc);
create index if not exists feedback_status_idx on public.feedback (status, created_at desc);

-- Administradores de la aplicación (ven todas las observaciones).
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;
alter table public.app_admins enable row level security;

-- Usuarios: insertan y leen solo sus propias observaciones.
drop policy if exists feedback_insert_own on public.feedback;
create policy feedback_insert_own on public.feedback
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists feedback_read_own on public.feedback;
create policy feedback_read_own on public.feedback
  for select to authenticated
  using (auth.uid() = user_id);

-- app_admins: nadie lee/escribe desde el cliente; solo service_role.
revoke all on public.feedback from public;
revoke all on public.feedback from anon;
revoke all on public.app_admins from public;
revoke all on public.app_admins from anon;
revoke all on public.app_admins from authenticated;
grant all on table public.app_admins to service_role;
