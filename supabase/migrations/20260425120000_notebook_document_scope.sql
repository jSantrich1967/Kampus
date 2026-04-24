-- Optional curriculum tags per file: used when filtering study kit / rescue grounding.

alter table public.notebook_documents
  add column if not exists topic text not null default '';

alter table public.notebook_documents
  add column if not exists lesson_point text not null default '';

alter table public.notebook_documents
  add column if not exists practice_exercises text not null default '';

comment on column public.notebook_documents.topic is 'Tema del material (etiqueta libre al subir).';
comment on column public.notebook_documents.lesson_point is 'Punto o sub-bloque del programa (etiqueta libre).';
comment on column public.notebook_documents.practice_exercises is 'Ejercicios prácticos o referencia (texto libre).';

create index if not exists notebook_documents_user_subject_topic_idx
  on public.notebook_documents (user_id, subject, topic);
