-- Kampus: permitir el nuevo tipo de aviso 'class' (clases virtuales) en el
-- log del cron de recordatorios de WhatsApp.
--
-- APLICAR: pegar este archivo completo en Supabase → SQL Editor → Run.
-- Mientras no se aplique, el cron degrada sin ruido: el insert de tipo 'class'
-- falla por el CHECK viejo y esa línea simplemente se salta (el resto de
-- avisos —exámenes, exposiciones, entregas— sigue normal). Al aplicarse, las
-- clases virtuales inscritas empiezan a avisarse en el siguiente cron 8:00 am.

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.whatsapp_reminder_log'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%kind%'
      and pg_get_constraintdef(oid) ilike '%exam%'
  loop
    execute format('alter table public.whatsapp_reminder_log drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.whatsapp_reminder_log
  drop constraint if exists whatsapp_reminder_log_kind_check;

alter table public.whatsapp_reminder_log
  add constraint whatsapp_reminder_log_kind_check
  check (kind in ('exam', 'work', 'presentation', 'class'));
