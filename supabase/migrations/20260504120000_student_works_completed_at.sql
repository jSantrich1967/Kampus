-- Marcar trabajos / investigaciones como entregados sin borrarlos (sincroniza con la app).

alter table public.student_works
  add column if not exists completed_at timestamptz null;

comment on column public.student_works.completed_at is 'Si no es null, la entrega se considera realizada (no aparece como pendiente en el calendario).';
