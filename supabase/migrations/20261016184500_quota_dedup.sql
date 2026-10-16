-- Quota hardening: dedup window + no increment on deny.
-- 1) Si el mismo usuario consume la misma cuota dos veces en <10 s, la segunda
--    no incrementa (anti doble-cobro: doble clic, reintento de red, etc.).
-- 2) Los intentos denegados por límite ya no inflan used_count.

alter table public.api_usage_quotas
  add column if not exists last_consumed_at timestamptz;

create or replace function public.consume_api_quota(p_quota_key text, p_daily_limit int)
returns table(allowed boolean, used int, daily_limit int, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  cur_used int;
  cur_last timestamptz;
  next_used int;
  lim int;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'unauthenticated';
  end if;
  if p_quota_key is null or length(trim(p_quota_key)) = 0 or length(p_quota_key) > 80 then
    raise exception 'invalid_quota_key';
  end if;
  lim := greatest(p_daily_limit, 0);

  select q.used_count, q.last_consumed_at into cur_used, cur_last
  from public.api_usage_quotas q
  where q.user_id = uid and q.quota_key = p_quota_key and q.quota_day = current_date;

  if found then
    if cur_last is not null and now() - cur_last < interval '10 seconds' then
      allowed := cur_used <= lim;
      used := cur_used;
      daily_limit := p_daily_limit;
      reset_at := date_trunc('day', now()) + interval '1 day';
      return next;
    end if;
    if cur_used >= lim then
      allowed := false;
      used := cur_used;
      daily_limit := p_daily_limit;
      reset_at := date_trunc('day', now()) + interval '1 day';
      return next;
    end if;
  end if;

  insert into public.api_usage_quotas (user_id, quota_key, quota_day, used_count, last_consumed_at)
  values (uid, p_quota_key, current_date, 1, now())
  on conflict (user_id, quota_key, quota_day)
  do update set used_count = public.api_usage_quotas.used_count + 1,
                last_consumed_at = now(),
                updated_at = now()
  returning used_count into next_used;

  allowed := next_used <= lim;
  used := next_used;
  daily_limit := p_daily_limit;
  reset_at := date_trunc('day', now()) + interval '1 day';
  return next;
end;
$$;

revoke all on function public.consume_api_quota(text, int) from public;
grant execute on function public.consume_api_quota(text, int) to authenticated;
grant execute on function public.consume_api_quota(text, int) to service_role;
