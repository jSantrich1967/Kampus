-- Kampus: community MVP (posts + answers) in Supabase + RLS.

-- ---------------------------------------------------------------------------
-- Table: community_posts (short posts per channel, user-owned)
-- ---------------------------------------------------------------------------
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  channel_id text not null,
  body text not null check (char_length(body) <= 1200),
  created_at timestamptz not null default now()
);

comment on table public.community_posts is 'User posts inside community channels (MVP).';

create index if not exists community_posts_channel_created_idx
  on public.community_posts (channel_id, created_at desc);

create index if not exists community_posts_user_created_idx
  on public.community_posts (user_id, created_at desc);

alter table public.community_posts enable row level security;

drop policy if exists "community_posts_select_all_auth" on public.community_posts;
create policy "community_posts_select_all_auth"
  on public.community_posts for select to authenticated
  using (true);

drop policy if exists "community_posts_insert_own" on public.community_posts;
create policy "community_posts_insert_own"
  on public.community_posts for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "community_posts_update_own" on public.community_posts;
create policy "community_posts_update_own"
  on public.community_posts for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "community_posts_delete_own" on public.community_posts;
create policy "community_posts_delete_own"
  on public.community_posts for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.community_posts from public;
grant select, insert, update, delete on table public.community_posts to authenticated;
grant all on table public.community_posts to service_role;

-- ---------------------------------------------------------------------------
-- Table: community_question_answers (answers to "common questions", by question id)
-- ---------------------------------------------------------------------------
create table if not exists public.community_question_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  body text not null check (char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

comment on table public.community_question_answers is 'Answers to common questions (question_id is a stable string).';

create index if not exists community_answers_question_created_idx
  on public.community_question_answers (question_id, created_at desc);

create index if not exists community_answers_user_created_idx
  on public.community_question_answers (user_id, created_at desc);

alter table public.community_question_answers enable row level security;

drop policy if exists "community_answers_select_all_auth" on public.community_question_answers;
create policy "community_answers_select_all_auth"
  on public.community_question_answers for select to authenticated
  using (true);

drop policy if exists "community_answers_insert_own" on public.community_question_answers;
create policy "community_answers_insert_own"
  on public.community_question_answers for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "community_answers_update_own" on public.community_question_answers;
create policy "community_answers_update_own"
  on public.community_question_answers for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "community_answers_delete_own" on public.community_question_answers;
create policy "community_answers_delete_own"
  on public.community_question_answers for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.community_question_answers from public;
grant select, insert, update, delete on table public.community_question_answers to authenticated;
grant all on table public.community_question_answers to service_role;

