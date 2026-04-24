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
