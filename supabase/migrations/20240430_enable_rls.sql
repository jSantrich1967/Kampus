/*
  Migration: Enable RLS and policies for production tables.
  Generated on 2026-05-05.
*/

-- Enable RLS for student_works
ALTER TABLE public.student_works ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_works_select_own ON public.student_works;
CREATE POLICY student_works_select_own ON public.student_works
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS student_works_insert_own ON public.student_works;
CREATE POLICY student_works_insert_own ON public.student_works
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS student_works_update_own ON public.student_works;
CREATE POLICY student_works_update_own ON public.student_works
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS student_works_delete_own ON public.student_works;
CREATE POLICY student_works_delete_own ON public.student_works
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Enable RLS for user_presentation_agenda
ALTER TABLE public.user_presentation_agenda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_presentation_agenda_select_own ON public.user_presentation_agenda;
CREATE POLICY user_presentation_agenda_select_own ON public.user_presentation_agenda
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS user_presentation_agenda_insert_own ON public.user_presentation_agenda;
CREATE POLICY user_presentation_agenda_insert_own ON public.user_presentation_agenda
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS user_presentation_agenda_update_own ON public.user_presentation_agenda;
CREATE POLICY user_presentation_agenda_update_own ON public.user_presentation_agenda
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS user_presentation_agenda_delete_own ON public.user_presentation_agenda;
CREATE POLICY user_presentation_agenda_delete_own ON public.user_presentation_agenda
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
