/**
 * Map low-level Supabase Storage / API messages to actionable Spanish copy.
 */
export function formatNotebookCloudError(message: string): string {
  const m = message.trim();
  const low = m.toLowerCase();
  if (low.includes("bucket not found")) {
    return (
      "Falta el bucket de Storage «notebooks» en tu proyecto Supabase. " +
      "Abre el SQL Editor y ejecuta el archivo del repo `supabase/migrations/20260424180000_notebook_documents.sql` " +
      "(crea tabla `notebook_documents`, bucket `notebooks` y políticas). " +
      "O crea manualmente en Storage un bucket privado con id exacto `notebooks` y luego ejecuta en SQL la parte de políticas de ese mismo archivo."
    );
  }
  return m;
}

/** Mensajes claros cuando faltan tablas del calendario / agenda en Supabase. */
export function formatAgendaCloudError(message: string): string {
  const low = message.trim().toLowerCase();
  if (low.includes("student_works") && low.includes("completed_at")) {
    return (
      "Falta la columna `completed_at` en `student_works` (función «entregado» en Mis investigaciones). " +
      "En el SQL Editor de Supabase abre y ejecuta `supabase/migrations/20260504120000_student_works_completed_at.sql` del repo, " +
      "o ejecuta: `alter table public.student_works add column if not exists completed_at timestamptz null;` " +
      "Detalle técnico: " +
      message.trim()
    );
  }
  if (low.includes("diary_entries")) {
    return (
      "Falta la tabla `diary_entries` en Supabase (Mi Diario en la nube). " +
      "En el SQL Editor ejecuta `supabase/migrations/20260505140000_diary_entries.sql` del repo y vuelve a intentar. " +
      "Detalle técnico: " +
      message.trim()
    );
  }
  if (
    low.includes("user_exams") ||
    low.includes("user_exam_attempts") ||
    low.includes("student_works") ||
    low.includes("user_presentation_agenda") ||
    low.includes("user_presentation_decks")
  ) {
    return (
      "Faltan tablas o columnas de agenda en Supabase (exámenes, intentos, trabajos o exposiciones). " +
      "En el SQL Editor ejecuta, en este orden si aplica: `20260426140000_agenda_supabase.sql`, " +
      "`20260429103000_user_presentation_decks.sql` y `20260504120000_student_works_completed_at.sql` " +
      "(esta última añade `completed_at` en trabajos). Vuelve a intentar. Detalle técnico: " +
      message.trim()
    );
  }
  return formatNotebookCloudError(message);
}
