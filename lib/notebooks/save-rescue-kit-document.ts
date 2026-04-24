import type { RescuePack } from "@/lib/class-rescue";
import { sanitizeStorageFilename, subjectToPathSegment } from "@/lib/notebooks/paths";
import { serializeRescuePackToPlainText } from "@/lib/notebooks/rescue-pack-plain-text";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type SaveRescueKitInput = {
  authUserId: string;
  subject: string;
  topic: string;
  lesson_point: string;
  practice_exercises: string;
  pack: RescuePack;
};

/**
 * Uploads kit as UTF-8 text to `notebooks` bucket and inserts `notebook_documents` (same shape as manual uploads).
 */
export async function saveRescueKitAsNotebookDocument(input: SaveRescueKitInput): Promise<void> {
  const subject = input.subject.trim() || "General";
  const segment = subjectToPathSegment(subject);
  const body = serializeRescuePackToPlainText(input.pack);
  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const displayName = `Rescate ${new Date().toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}.txt`.replace(
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
