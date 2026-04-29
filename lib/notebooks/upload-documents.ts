import type { SupabaseClient } from "@supabase/supabase-js";

import { sanitizeStorageFilename, subjectToPathSegment } from "@/lib/notebooks/paths";

/** Aligned with bucket limit in migration (50 MiB). */
export const MAX_NOTEBOOK_UPLOAD_BYTES = 50 * 1024 * 1024;

export type NotebookUploadDocumentFields = {
  topic: string;
  lesson_point: string;
  practice_exercises: string;
  schedule_id: string | null;
  class_date: string | null;
};

/**
 * Optional text extraction via the same API used by Rescue; failures return null.
 */
export async function extractNotebookTextWithRescueApi(file: File): Promise<string | null> {
  try {
    const fd = new FormData();
    fd.append("files", file);
    const res = await fetch("/api/rescue/extract", { method: "POST", body: fd });
    const json = (await res.json()) as { combinedText?: string; error?: string };
    if (res.ok && json.combinedText?.trim()) {
      return json.combinedText.trim();
    }
  } catch {
    // Extraction is optional; upload still proceeds
  }
  return null;
}

/**
 * Upserts `user_notebooks`, uploads each file to Storage, inserts `notebook_documents`.
 * Caller validates calendar-link rules and tag requirements for contextual uploads.
 */
export async function uploadNotebookDocuments(
  client: SupabaseClient,
  args: {
    userId: string;
    subject: string;
    files: File[];
    fields: NotebookUploadDocumentFields;
  },
): Promise<void> {
  const { userId, subject, files, fields } = args;
  const segment = subjectToPathSegment(subject);

  await client.from("user_notebooks").upsert({ user_id: userId, subject });

  for (const file of files) {
    if (file.size > MAX_NOTEBOOK_UPLOAD_BYTES) {
      throw new Error(`“${file.name}” supera el límite de ${MAX_NOTEBOOK_UPLOAD_BYTES / 1024 / 1024} MB.`);
    }

    const extractedText = await extractNotebookTextWithRescueApi(file);
    const safeName = sanitizeStorageFilename(file.name);
    const storagePath = `${userId}/${segment}/${crypto.randomUUID()}_${safeName}`;

    const { error: upErr } = await client.storage.from("notebooks").upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });
    if (upErr) throw upErr;

    const { error: insErr } = await client.from("notebook_documents").insert({
      user_id: userId,
      subject,
      topic: fields.topic,
      lesson_point: fields.lesson_point,
      practice_exercises: fields.practice_exercises,
      schedule_id: fields.schedule_id,
      class_date: fields.class_date,
      storage_path: storagePath,
      filename: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      extracted_text: extractedText,
    });
    if (insErr) {
      await client.storage.from("notebooks").remove([storagePath]);
      throw insErr;
    }
  }
}
