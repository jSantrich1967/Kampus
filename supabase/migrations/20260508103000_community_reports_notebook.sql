-- Community Iter 3: post reports (moderation MVP) + notebook resource kind.

alter table public.community_posts
  add column if not exists resource_kind text;

alter table public.community_posts
  drop constraint if exists community_posts_resource_kind_check;
alter table public.community_posts
  add constraint community_posts_resource_kind_check
  check (resource_kind is null or resource_kind in ('external', 'notebook'));

comment on column public.community_posts.resource_kind is 'external URL vs in-app notebook link.';

-- ---------------------------------------------------------------------------
-- Table: community_post_reports (one report per user per post)
-- ---------------------------------------------------------------------------
create table if not exists public.community_post_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid not null references public.community_posts (id) on delete cascade,
  reason text not null check (char_length(reason) <= 64),
  detail text check (detail is null or char_length(detail) <= 500),
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

comment on table public.community_post_reports is 'User reports on community posts (moderation MVP).';

create index if not exists community_post_reports_post_idx
  on public.community_post_reports (post_id, created_at desc);

alter table public.community_post_reports enable row level security;

drop policy if exists "community_reports_select_own" on public.community_post_reports;
create policy "community_reports_select_own"
  on public.community_post_reports for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "community_reports_insert_own" on public.community_post_reports;
create policy "community_reports_insert_own"
  on public.community_post_reports for insert to authenticated
  with check (auth.uid() = user_id);

revoke all on public.community_post_reports from public;
grant select, insert on table public.community_post_reports to authenticated;
grant all on table public.community_post_reports to service_role;
