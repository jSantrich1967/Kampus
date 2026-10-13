create table if not exists public.topic_visualizations (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  topic text not null,
  topic_hash text not null,
  html text not null,
  model text not null default '',
  created_at timestamptz not null default now(),
  constraint topic_visualizations_hash_unique unique (topic_hash)
);

create index if not exists topic_visualizations_hash_idx
  on public.topic_visualizations (topic_hash);

alter table public.topic_visualizations enable row level security;

drop policy if exists "topic_visualizations_select_all" on public.topic_visualizations;
create policy "topic_visualizations_select_all"
  on public.topic_visualizations for select
  to authenticated
  using (true);

revoke all on public.topic_visualizations from public;
revoke all on public.topic_visualizations from anon;
grant select on table public.topic_visualizations to authenticated;
grant all on table public.topic_visualizations to service_role;
