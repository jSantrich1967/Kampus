-- Community Iter 2: optional shared resource links + "helpful" votes on posts.

alter table public.community_posts
  add column if not exists resource_url text,
  add column if not exists resource_label text;

comment on column public.community_posts.resource_url is 'Optional link to shared study resource (PDF, Drive, etc.).';
comment on column public.community_posts.resource_label is 'Short label for resource_url (e.g. Resumen cap. 3).';

alter table public.community_posts
  drop constraint if exists community_posts_resource_url_len;
alter table public.community_posts
  add constraint community_posts_resource_url_len
  check (resource_url is null or char_length(resource_url) <= 500);

alter table public.community_posts
  drop constraint if exists community_posts_resource_label_len;
alter table public.community_posts
  add constraint community_posts_resource_label_len
  check (resource_label is null or char_length(resource_label) <= 120);

-- ---------------------------------------------------------------------------
-- Table: community_post_helpful (one vote per user per post)
-- ---------------------------------------------------------------------------
create table if not exists public.community_post_helpful (
  user_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid not null references public.community_posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

comment on table public.community_post_helpful is 'Users marking community posts as helpful.';

create index if not exists community_post_helpful_post_idx
  on public.community_post_helpful (post_id);

alter table public.community_post_helpful enable row level security;

drop policy if exists "community_helpful_select_auth" on public.community_post_helpful;
create policy "community_helpful_select_auth"
  on public.community_post_helpful for select to authenticated
  using (true);

drop policy if exists "community_helpful_insert_own" on public.community_post_helpful;
create policy "community_helpful_insert_own"
  on public.community_post_helpful for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "community_helpful_delete_own" on public.community_post_helpful;
create policy "community_helpful_delete_own"
  on public.community_post_helpful for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.community_post_helpful from public;
grant select, insert, delete on table public.community_post_helpful to authenticated;
grant all on table public.community_post_helpful to service_role;
