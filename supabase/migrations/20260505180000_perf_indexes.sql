-- Performance: indexes for frequent filters/sorts (production hardening).
-- Safe to run multiple times (IF NOT EXISTS).

-- ---------------------------------------------------------------------------
-- student_works: UI typically queries pending (completed_at is null) ordered by due_date
-- ---------------------------------------------------------------------------
create index if not exists student_works_user_due_pending_idx
  on public.student_works (user_id, due_date)
  where completed_at is null;

create index if not exists student_works_user_completed_at_idx
  on public.student_works (user_id, completed_at desc)
  where completed_at is not null;

-- ---------------------------------------------------------------------------
-- user_exams: common filter is status='open' for badges + due_date ordering
-- ---------------------------------------------------------------------------
create index if not exists user_exams_user_open_due_idx
  on public.user_exams (user_id, due_date)
  where status = 'open';

-- ---------------------------------------------------------------------------
-- api_usage_quotas: lookups are by (user_id, quota_key, quota_day)
-- PK already covers this, but this can help when scanning by user+key over time.
-- ---------------------------------------------------------------------------
create index if not exists api_usage_quotas_user_key_day_idx
  on public.api_usage_quotas (user_id, quota_key, quota_day desc);

