-- Rachas de estudio: un registro por usuario y día con actividad real.
create table if not exists public.study_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  activities integer not null default 1,
  kinds text[] not null default '{}',
  primary key (user_id, day)
);

alter table public.study_days enable row level security;

drop policy if exists "study_days_owner_all" on public.study_days;
create policy "study_days_owner_all"
  on public.study_days
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Registra actividad de hoy (idempotente por día; suma al contador).
create or replace function public.log_study_day(p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;

  insert into public.study_days (user_id, day, activities, kinds)
  values (auth.uid(), current_date, 1, array[p_kind])
  on conflict (user_id, day) do update
  set activities = public.study_days.activities + 1,
      kinds = (select array_agg(distinct k) from unnest(public.study_days.kinds || excluded.kinds) as k);

  return jsonb_build_object('ok', true);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'failed');
end;
$$;

revoke all on function public.log_study_day(text) from public;
grant execute on function public.log_study_day(text) to authenticated;

-- Racha actual, más larga, total de días y lista de días (para el widget y reportes).
create or replace function public.get_study_streak()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days date[];
  v_current integer := 0;
  v_longest integer := 0;
  v_run integer := 0;
  v_prev date := null;
  v_d date;
  v_i integer;
  v_today date := current_date;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;

  select array_agg(day order by day) into v_days
  from public.study_days
  where user_id = auth.uid();

  if v_days is null or array_length(v_days, 1) is null then
    return jsonb_build_object('ok', true, 'current', 0, 'longest', 0, 'total', 0, 'days', '[]'::jsonb);
  end if;

  foreach v_d in array v_days loop
    if v_prev is null or v_d = v_prev + 1 then
      v_run := v_run + 1;
    else
      v_run := 1;
    end if;
    if v_run > v_longest then v_longest := v_run; end if;
    v_prev := v_d;
  end loop;

  v_prev := null;
  for v_i in reverse array_upper(v_days, 1) .. 1 loop
    v_d := v_days[v_i];
    if v_prev is null then
      if v_d = v_today or v_d = v_today - 1 then
        v_current := 1;
        v_prev := v_d;
      else
        exit;
      end if;
    elsif v_d = v_prev - 1 then
      v_current := v_current + 1;
      v_prev := v_d;
    else
      exit;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'current', v_current,
    'longest', v_longest,
    'total', array_length(v_days, 1),
    'days', (select coalesce(jsonb_agg(d order by d desc), '[]'::jsonb) from (select unnest(v_days) as d) s)
  );
end;
$$;

revoke all on function public.get_study_streak() from public;
grant execute on function public.get_study_streak() to authenticated;
