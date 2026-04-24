-- Kampus: exámenes, intentos, trabajos con fecha y fecha de exposición (calendario académico) en Supabase + RLS.

-- ---------------------------------------------------------------------------
-- user_exams: exámenes del usuario (reemplaza demo solo-local cuando hay auth)
-- ---------------------------------------------------------------------------
create table if not exists public.user_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null,
  title text not null,
  description text not null default '',
  status text not null default 'open' check (status in ('draft', 'open', 'closed')),
  due_date date,
  questions jsonb not null,
  created_at timestamptz not null default now()
);

comment on table public.user_exams is 'Exámenes publicados o de práctica del alumno; questions es JSON [{id,prompt},…].';

create index if not exists user_exams_user_due_idx on public.user_exams (user_id, due_date);
create index if not exists user_exams_user_created_idx on public.user_exams (user_id, created_at desc);

alter table public.user_exams enable row level security;

drop policy if exists "user_exams_select_own" on public.user_exams;
create policy "user_exams_select_own"
  on public.user_exams for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_exams_insert_own" on public.user_exams;
create policy "user_exams_insert_own"
  on public.user_exams for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_exams_update_own" on public.user_exams;
create policy "user_exams_update_own"
  on public.user_exams for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_exams_delete_own" on public.user_exams;
create policy "user_exams_delete_own"
  on public.user_exams for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.user_exams from public;
grant select, insert, update, delete on table public.user_exams to authenticated;
grant all on table public.user_exams to service_role;

-- ---------------------------------------------------------------------------
-- user_exam_attempts
-- ---------------------------------------------------------------------------
create table if not exists public.user_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exam_id uuid not null references public.user_exams (id) on delete cascade,
  student_label text not null,
  answers jsonb not null default '{}'::jsonb,
  status text not null check (status in ('submitted', 'graded')),
  feedback jsonb,
  submitted_at timestamptz not null default now()
);

comment on table public.user_exam_attempts is 'Intentos de examen; feedback JSON cuando status=graded.';

create index if not exists user_exam_attempts_user_exam_idx
  on public.user_exam_attempts (user_id, exam_id, submitted_at desc);

alter table public.user_exam_attempts enable row level security;

drop policy if exists "user_exam_attempts_select_own" on public.user_exam_attempts;
create policy "user_exam_attempts_select_own"
  on public.user_exam_attempts for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_exam_attempts_insert_own" on public.user_exam_attempts;
create policy "user_exam_attempts_insert_own"
  on public.user_exam_attempts for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_exam_attempts_update_own" on public.user_exam_attempts;
create policy "user_exam_attempts_update_own"
  on public.user_exam_attempts for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_exam_attempts_delete_own" on public.user_exam_attempts;
create policy "user_exam_attempts_delete_own"
  on public.user_exam_attempts for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.user_exam_attempts from public;
grant select, insert, update, delete on table public.user_exam_attempts to authenticated;
grant all on table public.user_exam_attempts to service_role;

-- ---------------------------------------------------------------------------
-- student_works: trabajos / investigaciones con fecha límite
-- ---------------------------------------------------------------------------
create table if not exists public.student_works (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  subject text not null default 'General',
  due_date date not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.student_works is 'Entregas registradas por el estudiante para el calendario académico.';

create index if not exists student_works_user_due_idx on public.student_works (user_id, due_date);

alter table public.student_works enable row level security;

drop policy if exists "student_works_select_own" on public.student_works;
create policy "student_works_select_own"
  on public.student_works for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "student_works_insert_own" on public.student_works;
create policy "student_works_insert_own"
  on public.student_works for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "student_works_update_own" on public.student_works;
create policy "student_works_update_own"
  on public.student_works for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "student_works_delete_own" on public.student_works;
create policy "student_works_delete_own"
  on public.student_works for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.student_works from public;
grant select, insert, update, delete on table public.student_works to authenticated;
grant all on table public.student_works to service_role;

-- ---------------------------------------------------------------------------
-- user_presentation_agenda: título + fecha para calendario (resto del planificador sigue en localStorage)
-- ---------------------------------------------------------------------------
create table if not exists public.user_presentation_agenda (
  user_id uuid primary key references auth.users (id) on delete cascade,
  deck_title text not null default '',
  presentation_due_date date,
  updated_at timestamptz not null default now()
);

comment on table public.user_presentation_agenda is 'Sincroniza título y fecha de exposición con el calendario entre dispositivos.';

create or replace function public.set_user_presentation_agenda_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_presentation_agenda_set_updated_at on public.user_presentation_agenda;
create trigger user_presentation_agenda_set_updated_at
  before update on public.user_presentation_agenda
  for each row execute function public.set_user_presentation_agenda_updated_at();

alter table public.user_presentation_agenda enable row level security;

drop policy if exists "user_presentation_agenda_select_own" on public.user_presentation_agenda;
create policy "user_presentation_agenda_select_own"
  on public.user_presentation_agenda for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_presentation_agenda_insert_own" on public.user_presentation_agenda;
create policy "user_presentation_agenda_insert_own"
  on public.user_presentation_agenda for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_presentation_agenda_update_own" on public.user_presentation_agenda;
create policy "user_presentation_agenda_update_own"
  on public.user_presentation_agenda for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_presentation_agenda_delete_own" on public.user_presentation_agenda;
create policy "user_presentation_agenda_delete_own"
  on public.user_presentation_agenda for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.user_presentation_agenda from public;
grant select, insert, update, delete on table public.user_presentation_agenda to authenticated;
grant all on table public.user_presentation_agenda to service_role;
