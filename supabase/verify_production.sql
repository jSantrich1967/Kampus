-- Run in Supabase SQL Editor (read-only). Safe to re-run.
--
-- Nota: el editor de Supabase a veces solo muestra el resultado de la ÚLTIMA
-- sentencia si pegas varias SELECT seguidas. Este archivo usa UNA sola consulta
-- para que veas todo en una sola tabla.

with
  expected_tables (table_name) as (
    values
      ('profiles'),
      ('user_exams'),
      ('user_exam_attempts'),
      ('student_works'),
      ('user_presentation_agenda'),
      ('notebook_documents'),
      ('user_notebooks'),
      ('user_presentation_decks'),
      ('user_class_schedule'),
      ('user_class_cancellations'),
      ('virtual_class_sessions'),
      ('virtual_class_roster'),
      ('community_posts'),
      ('community_question_answers'),
      ('diary_entries'),
      ('api_usage_quotas'),
      ('institution_kpis'),
      ('institution_course_signals')
  ),
  tables_found as (
    select
      c.relname::text as table_name,
      c.relrowsecurity as rls_enabled
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where
      n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname::text in (select table_name from expected_tables)
  ),
  rls_report as (
    select
      '1_tabla_y_rls'::text as seccion,
      e.table_name::text as item,
      case
        when t.table_name is null then 'NO EXISTE — falta migración'
        when not t.rls_enabled then 'EXISTE pero RLS apagado — revisar'
        else 'OK (rls_enabled = true)'
      end::text as resultado
    from expected_tables e
    left join tables_found t on t.table_name = e.table_name
  ),
  completed_at_report as (
    select
      '2_columna_student_works'::text as seccion,
      'completed_at'::text as item,
      coalesce(
        (
          select
            data_type || ', nullable=' || is_nullable
          from information_schema.columns c
          where
            c.table_schema = 'public'
            and c.table_name = 'student_works'
            and c.column_name = 'completed_at'
          limit 1
        ),
        'FALTA — ejecuta migrations/20260504120000_student_works_completed_at.sql'
      )::text as resultado
  ),
  policy_agg as (
    select
      tablename::text as table_name,
      count(*)::int as n
    from pg_policies
    where
      schemaname = 'public'
      and tablename in (select table_name from expected_tables)
    group by tablename
  ),
  policy_report as (
    select
      '3_cantidad_politicas_rls'::text as seccion,
      e.table_name::text as item,
      case
        when pa.n is null then '0 — sin políticas (revisar migración / RLS)'
        else pa.n::text || ' políticas'
      end::text as resultado
    from expected_tables e
    left join policy_agg pa on pa.table_name = e.table_name
  )
select *
from rls_report
union all
select *
from completed_at_report
union all
select *
from policy_report
order by
  seccion,
  item;
