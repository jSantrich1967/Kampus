-- Additive cost ledger. Does not change api_usage_quotas or profile JSON.
-- Clients can read their own rows. Only the service role can insert them.

create table if not exists public.plans (
  id text primary key,
  name text not null,
  monthly_price_cents integer not null default 0,
  daily_ai_requests integer not null,
  monthly_ai_requests integer not null,
  daily_token_limit integer not null,
  monthly_token_limit integer not null,
  max_documents integer not null,
  max_document_size_mb integer not null,
  storage_limit_mb integer not null,
  features jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.plans is
  'Editable plan limits. Profile JSON is not the billing source of truth.';

insert into public.plans (
  id, name, monthly_price_cents,
  daily_ai_requests, monthly_ai_requests,
  daily_token_limit, monthly_token_limit,
  max_documents, max_document_size_mb, storage_limit_mb
) values
  ('free', 'Kampus Free', 0, 15, 200, 50000, 500000, 20, 10, 100),
  ('student', 'Kampus Student', 0, 40, 800, 200000, 3000000, 100, 25, 1024),
  ('pro', 'Kampus Pro', 0, 120, 3000, 1000000, 15000000, 500, 50, 10240)
on conflict (id) do nothing;

alter table public.plans enable row level security;

drop policy if exists "plans_select_active" on public.plans;
create policy "plans_select_active"
  on public.plans for select
  to authenticated
  using (active = true);

revoke all on public.plans from public;
revoke all on public.plans from anon;
grant select on table public.plans to authenticated;
grant all on table public.plans to service_role;

create table if not exists public.ai_model_prices (
  provider text not null,
  model text not null,
  input_usd_per_million numeric not null,
  output_usd_per_million numeric not null,
  cached_input_usd_per_million numeric not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (provider, model)
);

comment on table public.ai_model_prices is
  'Editable provider prices per 1M tokens. Update rows when a vendor changes prices.';

insert into public.ai_model_prices (
  provider, model, input_usd_per_million, output_usd_per_million, cached_input_usd_per_million
) values
  ('openai', 'gpt-4.1-mini', 0.40, 1.60, 0.10),
  ('openai', 'gpt-4.1', 2.00, 8.00, 0.50),
  ('openai', 'gpt-4o-mini', 0.15, 0.60, 0.075)
on conflict (provider, model) do nothing;

alter table public.ai_model_prices enable row level security;

revoke all on public.ai_model_prices from public;
revoke all on public.ai_model_prices from anon;
revoke all on public.ai_model_prices from authenticated;
grant all on table public.ai_model_prices to service_role;

create table if not exists public.system_cost_settings (
  id text primary key,
  supabase_base_usd numeric not null default 0,
  supabase_per_mau_usd numeric not null default 0,
  supabase_db_gb_usd numeric not null default 0,
  supabase_storage_gb_usd numeric not null default 0,
  supabase_egress_gb_usd numeric not null default 0,
  vercel_base_usd numeric not null default 0,
  vercel_extra_usd numeric not null default 0,
  other_usd numeric not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.system_cost_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.system_cost_settings enable row level security;

revoke all on public.system_cost_settings from public;
revoke all on public.system_cost_settings from anon;
revoke all on public.system_cost_settings from authenticated;
grant all on table public.system_cost_settings to service_role;

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  provider text not null,
  model text not null,
  feature text not null,
  request_id text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cached_tokens integer not null default 0,
  total_tokens integer not null default 0,
  estimated_cost_usd numeric not null default 0,
  response_time_ms integer not null default 0,
  success boolean not null,
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  constraint ai_usage_metadata_object check (jsonb_typeof(metadata) = 'object')
);

comment on table public.ai_usage is
  'One row per model call. Do not store prompts or document text.';

create index if not exists ai_usage_user_created_idx
  on public.ai_usage (user_id, created_at desc);

create index if not exists ai_usage_feature_created_idx
  on public.ai_usage (feature, created_at desc);

alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own"
  on public.ai_usage for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.ai_usage from public;
revoke all on public.ai_usage from anon;
grant select on table public.ai_usage to authenticated;
grant all on table public.ai_usage to service_role;
