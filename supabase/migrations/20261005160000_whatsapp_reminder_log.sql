-- Log de recordatorios de WhatsApp enviados por el cron.
-- Evita enviar el mismo aviso dos veces para el mismo evento.
create table if not exists public.whatsapp_reminder_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_key text not null,
  kind text not null check (kind in ('exam', 'work', 'presentation')),
  reminder_day text not null check (reminder_day in ('tomorrow', 'today')),
  event_date date not null,
  sent_at timestamptz not null default now(),
  twilio_sid text,
  error text
);

create unique index if not exists whatsapp_reminder_log_dedupe
  on public.whatsapp_reminder_log (user_id, event_key, reminder_day, event_date);

alter table public.whatsapp_reminder_log enable row level security;

-- Solo el service role escribe/lee (el cron). Nadie más toca esta tabla.
create policy whatsapp_reminder_log_service_all on public.whatsapp_reminder_log
  for all using (false) with check (false);
