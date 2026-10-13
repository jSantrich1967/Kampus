-- Persiste el diagnóstico del Modo examen (tema por tema) para que el plan
-- de estudio y el Tutor IA lo reutilicen sin repetir el diagnóstico.
-- Sin esta tabla el flujo sigue funcionando: las rutas degradan con
-- elegancia (try/catch) hasta que se aplique la migración.

create table if not exists public.cram_diagnoses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null,
  topics jsonb not null default '[]'::jsonb,
  correct integer not null default 0,
  total integer not null default 0,
  created_at timestamptz not null default now(),
  constraint cram_diagnoses_topics_array check (jsonb_typeof(topics) = 'array')
);

comment on table public.cram_diagnoses is
  'Último diagnóstico por materia (temas con aciertos/total). Lo escriben las cuentas al completar el diagnóstico; lo leen el plan y el Tutor.';

create index if not exists cram_diagnoses_user_subject_created_idx
  on public.cram_diagnoses (user_id, subject, created_at desc);

alter table public.cram_diagnoses enable row level security;

drop policy if exists "cram_diagnoses_select_own" on public.cram_diagnoses;
create policy "cram_diagnoses_select_own"
  on public.cram_diagnoses for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "cram_diagnoses_insert_own" on public.cram_diagnoses;
create policy "cram_diagnoses_insert_own"
  on public.cram_diagnoses for insert
  to authenticated
  with check (auth.uid() = user_id);

revoke all on public.cram_diagnoses from public;
revoke all on public.cram_diagnoses from anon;
grant select, insert on table public.cram_diagnoses to authenticated;
grant all on table public.cram_diagnoses to service_role;
