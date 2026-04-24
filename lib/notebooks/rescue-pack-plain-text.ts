/**
 * Block prepended to `notes` when calling `/api/rescue/pack` so the model can align the kit with cuaderno tags.
 */
export function buildRescueTagNotesSection(
  subjectHint: string,
  topic: string,
  lessonPoint: string,
  practiceExercises: string,
): string {
  const lines: string[] = ["--- Etiquetas del rescate (misma clasificación que en Mis cuadernos) ---"];
  lines.push(`Materia: ${subjectHint.trim() || "General"}`);
  lines.push(`Tema: ${topic.trim() || "(no indicado)"}`);
  lines.push(`Punto: ${lessonPoint.trim() || "(no indicado)"}`);
  lines.push(`Ejercicios prácticos: ${practiceExercises.trim() || "(no indicado)"}`);
  return lines.join("\n");
}

/**
 * Body stored in the cuaderno: only what you fed into the rescate (extracts, pasted notes, link) — not the IA kit.
 */
export function buildRescueSourceDocumentBody(extractedText: string, pastedNotes: string, link: string): string {
  const ex = extractedText.trim();
  const n = pastedNotes.trim();
  const l = link.trim();
  const parts: string[] = [];
  if (ex) parts.push(`# Texto extraído / archivos\n\n${ex}`);
  if (n) parts.push(`# Apuntes pegados\n\n${n}`);
  if (l) parts.push(`# Enlace\n\n${l}`);
  if (parts.length === 0) return "";
  const intro = `Material usado en rescate de clase\nFecha: ${new Date().toLocaleString("es-ES")}\n\n---\n\n`;
  return intro + parts.join("\n\n---\n\n");
}
