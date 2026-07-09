import type { SupabaseClient } from "@supabase/supabase-js";

import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import { extractNotebookTextWithRescueApi } from "@/lib/notebooks/upload-documents";

function needsNotebookTextExtraction(text: string | null | undefined): boolean {
  const t = text?.trim() ?? "";
  if (!t) return true;
  const lower = t.toLowerCase();
  if (lower.includes("sin texto extraído")) return true;
  if (lower.includes("missing openai_api_key")) return true;
  if (lower.includes("ocr failed") || lower.includes("ocr no disponible")) return true;
  if (lower.includes("unsupported file type for extraction")) return true;
  return false;
}

/**
 * Uses cached `extracted_text` when present; otherwise downloads from Storage and
 * runs `/api/rescue/extract`, persisting the result for future kits.
 */
export async function resolveNotebookDocumentExtractedText(
  client: SupabaseClient,
  doc: NotebookDocumentRow,
): Promise<NotebookDocumentRow> {
  if (!needsNotebookTextExtraction(doc.extracted_text)) {
    return doc;
  }

  const { data, error } = await client.storage.from("notebooks").createSignedUrl(doc.storage_path, 180);
  if (error || !data?.signedUrl) {
    return doc;
  }

  try {
    const response = await fetch(data.signedUrl);
    if (!response.ok) return doc;

    const blob = await response.blob();
    const file = new File([blob], doc.filename, {
      type: doc.mime_type || blob.type || "application/octet-stream",
    });
    const extracted = await extractNotebookTextWithRescueApi(file);
    if (!extracted?.trim()) return doc;

    const nextText = extracted.trim();
    await client.from("notebook_documents").update({ extracted_text: nextText }).eq("id", doc.id);
    return { ...doc, extracted_text: nextText };
  } catch {
    return doc;
  }
}

export async function resolveNotebookDocumentsExtractedText(
  client: SupabaseClient,
  docs: NotebookDocumentRow[],
): Promise<NotebookDocumentRow[]> {
  return Promise.all(docs.map((doc) => resolveNotebookDocumentExtractedText(client, doc)));
}
