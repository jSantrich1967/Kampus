-- Reset today's class presentation AI quotas (Supabase → SQL Editor).
-- Safe to run while testing; only affects the keys below for the current UTC day.

delete from public.api_usage_quotas
where quota_day = current_date
  and quota_key in (
    'class_presentation',
    'class_presentation_illustration',
    'class_presentation_speech'
  );
