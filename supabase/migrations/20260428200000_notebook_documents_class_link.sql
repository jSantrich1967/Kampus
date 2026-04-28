-- Kampus: enlazar material subido a una clase del horario y a una fecha específica.

alter table public.notebook_documents
  add column if not exists schedule_id uuid references public.user_class_schedule (id) on delete set null;

alter table public.notebook_documents
  add column if not exists class_date date;

comment on column public.notebook_documents.schedule_id is 'Referencia opcional a una clase del horario semanal.';
comment on column public.notebook_documents.class_date is 'Fecha (YYYY-MM-DD) de la clase a la que pertenece este material.';

create index if not exists notebook_documents_user_class_date_idx
  on public.notebook_documents (user_id, class_date desc);

create index if not exists notebook_documents_user_schedule_date_idx
  on public.notebook_documents (user_id, schedule_id, class_date desc);

