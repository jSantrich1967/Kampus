-- Kampus: nuevos tipos de aviso de WhatsApp — clases suspendidas y duelos.
--
-- APLICAR: pegar este archivo completo en Supabase → SQL Editor → Run.
-- Mientras no se aplique, el cron degrada sin ruido: los insert de tipo
-- 'cancelled'/'duel' fallan por el CHECK viejo y esos avisos simplemente
-- no se envían (el resto sigue normal).

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
  check (kind in ('exam', 'work', 'presentation', 'class', 'cancelled', 'duel'));
