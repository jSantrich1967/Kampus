-- Kampus: Premios por metas cumplidas.
--
-- APLICAR: pegar este archivo completo en Supabase → SQL Editor → Run.
-- Sin estas tablas, /premios muestra "Premios aún no está activo" y la app
-- sigue funcionando igual para todos.
--
-- Diseño: las tablas solo las toca el servidor (service_role) vía
-- /api/premios. Ahí se valida quién crea (admin de app_admins o dueño del
-- curso), quién ve cada premio (global = todos; curso = inscritos activos)
-- y se evalúan las metas con datos reales (study_days, duels,
-- user_exam_attempts, dominio por tema). El cliente no escribe directo:
-- nadie puede auto-otorgarse un premio ni días Pro.

create table if not exists public.prizes (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users (id) on delete cascade,
  scope text not null check (scope in ('global', 'course')),
  course_id uuid references public.courses (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  description text not null default '' check (char_length(description) <= 300),
  metric text not null check (metric in ('dias_estudio', 'racha', 'duelos', 'examenes', 'temas_dominados')),
  goal integer not null check (goal between 1 and 365),
  min_score integer check (min_score is null or min_score between 1 and 100),
  reward text not null default 'medalla' check (reward in ('medalla', 'medalla_pro')),
  pro_days integer check (pro_days is null or pro_days between 1 and 30),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint prizes_scope_course check (scope = 'global' or course_id is not null),
  constraint prizes_pro_only_global check (reward = 'medalla' or scope = 'global')
);

create index if not exists prizes_scope_active_idx on public.prizes (scope, active);
create index if not exists prizes_course_idx on public.prizes (course_id) where course_id is not null;
create index if not exists prizes_creator_idx on public.prizes (creator_id, created_at desc);

create table if not exists public.prize_awards (
  id uuid primary key default gen_random_uuid(),
  prize_id uuid not null references public.prizes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  awarded_at timestamptz not null default now(),
  pro_days_granted integer not null default 0,
  constraint prize_awards_unique unique (prize_id, user_id)
);

create index if not exists prize_awards_user_idx on public.prize_awards (user_id, awarded_at desc);
create index if not exists prize_awards_prize_idx on public.prize_awards (prize_id, awarded_at desc);

alter table public.prizes enable row level security;
alter table public.prize_awards enable row level security;

-- Sin políticas para usuarios: todo pasa por el servidor con service_role.
revoke all on public.prizes from public, anon, authenticated;
revoke all on public.prize_awards from public, anon, authenticated;
grant all on public.prizes to service_role;
grant all on public.prize_awards to service_role;

comment on table public.prizes is
  'Premios creados por admin (globales) o dueños de curso. La evaluación de metas y el otorgamiento viven en /api/premios (service_role).';
comment on table public.prize_awards is
  'Premios ganados por estudiantes. pro_days_granted registra los días Pro efectivamente sumados a billing_entitlements.';
