import { sanitizeStorageFilename, subjectToPathSegment } from "@/lib/notebooks/paths";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type SaveRescueNotebookSourceInput = {
  authUserId: string;
  subject: string;
  topic: string;
  lesson_point: string;
  practice_exercises: string;
  /** Texto combinado: extracción + apuntes pegados + enlace (lo que alimentó el rescate, sin el kit de la IA). */
  sourceText: string;
};

/**
 * Sube a Storage y crea fila en `notebook_documents` con el **material fuente** del rescate (no el kit generado).
 */
export async function saveRescueNotebookSource(input: SaveRescueNotebookSourceInput): Promise<void> {
  const body = input.sourceText.trim();
  if (!body) throw new Error("No hay material de entrada para guardar (texto extraído, apuntes o enlace).");

  const subject = input.subject.trim() || "General";
  const segment = subjectToPathSegment(subject);
  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const displayName = `Material rescate ${new Date().toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}.txt`.replace(
    /[/\\?%*:|"<>]/g,
    "-",
  );
  const safeSuffix = sanitizeStorageFilename(displayName);
  const storagePath = `${input.authUserId}/${segment}/${crypto.randomUUID()}_${safeSuffix}`;

  const supabase = createSupabaseBrowserClient();
  const { error: upErr } = await supabase.storage.from("notebooks").upload(storagePath, blob, {
    cacheControl: "3600",
    upsert: false,
    contentType: "text/plain;charset=utf-8",
  });
  if (upErr) throw upErr;

  const { error: insErr } = await supabase.from("notebook_documents").insert({
    user_id: input.authUserId,
    subject,
    topic: input.topic.trim(),
    lesson_point: input.lesson_point.trim(),
    practice_exercises: input.practice_exercises.trim(),
    storage_path: storagePath,
    filename: displayName.slice(0, 200),
    mime_type: "text/plain;charset=utf-8",
    size_bytes: blob.size,
    extracted_text: body,
  });
  if (insErr) {
    await supabase.storage.from("notebooks").remove([storagePath]);
    throw insErr;
  }
}
