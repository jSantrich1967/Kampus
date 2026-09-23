-- Generador de exámenes para docentes: guarda los exámenes creados con IA.
create table if not exists public.teacher_generated_exams (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  subject text not null default '',
  topic text not null default '',
  question_count integer not null default 10,
  question_types text not null default 'mixto',
  difficulty text not null default 'medio',
  exam_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists teacher_generated_exams_teacher_idx
  on public.teacher_generated_exams (teacher_id, created_at desc);

alter table public.teacher_generated_exams enable row level security;

drop policy if exists "teacher_generated_exams_owner_all" on public.teacher_generated_exams;
create policy "teacher_generated_exams_owner_all"
  on public.teacher_generated_exams
  for all
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);
