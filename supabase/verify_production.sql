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
      ('community_post_reports'),
      ('community_post_helpful'),
      ('community_posts'),
      ('community_question_answers'),
      ('diary_entries'),
      ('psychologist_chat_sessions'),
      ('wellbeing_institution_contributions'),
      ('wellbeing_push_subscriptions'),
      ('wellbeing_counselor_alerts'),
      ('collaborate_study_rooms'),
      ('collaborate_deadline_push_opt_in'),
      ('collaborate_deadline_push_last'),
      ('collaborate_study_room_presence'),
      ('collaborate_study_room_messages'),
      ('collaborate_webcal_tokens'),
      ('virtual_class_breakout_rooms'),
      ('virtual_class_attendance'),
      ('collaborate_lms_integrations'),
      ('virtual_class_participation'),
      ('api_usage_quotas'),
      ('collaborate_study_room_members'),
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
  ),
  expected_functions (fn_name) as (
    values
      ('consume_api_quota'),
      ('join_collaborate_study_room'),
      ('caller_may_read_institution'),
      ('handle_new_user'),
      ('set_profiles_updated_at'),
      ('enroll_virtual_class_session'),
      ('list_virtual_class_roster'),
      ('add_virtual_class_roster_by_email'),
      ('resolve_webcal_user_id'),
      ('mark_virtual_class_attendance'),
      ('list_institution_virtual_attendance_summary'),
      ('upsert_virtual_class_participation'),
      ('list_virtual_class_participation_live'),
      ('bootstrap_virtual_class_demo')
  ),
  fn_report as (
    select
      '4_funciones_criticas'::text as seccion,
      e.fn_name::text as item,
      case
        when p.proname is null then 'FALTA — revisa migración'
        else 'OK'
      end::text as resultado
    from expected_functions e
    left join pg_proc p on p.proname = e.fn_name
    left join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
  ),
  expected_indexes (idx_name, hint) as (
    values
      ('student_works_user_due_pending_idx', 'migrations/20260505180000_perf_indexes.sql'),
      ('student_works_user_completed_at_idx', 'migrations/20260505180000_perf_indexes.sql'),
      ('user_exams_user_open_due_idx', 'migrations/20260505180000_perf_indexes.sql'),
      ('api_usage_quotas_user_key_day_idx', 'migrations/20260505180000_perf_indexes.sql')
  ),
  idx_report as (
    select
      '5_indices_performance'::text as seccion,
      e.idx_name::text as item,
      case
        when i.indexname is null then 'FALTA — ejecuta ' || e.hint
        else 'OK'
      end::text as resultado
    from expected_indexes e
    left join pg_indexes i
      on i.schemaname = 'public'
      and i.indexname = e.idx_name
  )
select *
from rls_report
union all
select *
from completed_at_report
union all
select *
from policy_report
union all
select *
from fn_report
union all
select *
from idx_report
order by
  seccion,
  item;
