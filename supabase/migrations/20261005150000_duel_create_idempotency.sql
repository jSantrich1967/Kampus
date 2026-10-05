-- Idempotency for duel creation: retries reuse the same request id instead
-- of generating questions twice (and charging OpenAI twice).

alter table public.duels
  add column if not exists request_id text;

create unique index if not exists duels_request_id_unique
  on public.duels (request_id)
  where request_id is not null;
