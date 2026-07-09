import type { SupabaseClient } from "@supabase/supabase-js";

import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import { isUsefulExtractedText } from "@/lib/rescue/extract-text-quality";

function needsNotebookTextExtraction(text: string | null | undefined): boolean {
  return !isUsefulExtractedText(text ?? "");
}

type NotebookExtractApiResponse = {
  combinedText?: string;
  useful?: boolean;
  cached?: boolean;
  hint?: string;
  error?: string;
};

/**
 * Uses cached `extracted_text` when useful; otherwise runs server-side extraction
 * from Storage (`/api/notebooks/extract`) — no 4 MB upload limit.
 */
export async function resolveNotebookDocumentExtractedText(
  client: SupabaseClient,
  doc: NotebookDocumentRow,
): Promise<NotebookDocumentRow> {
  if (!needsNotebookTextExtraction(doc.extracted_text)) {
    return doc;
  }

  try {
    const res = await fetch("/api/notebooks/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: doc.id, force: true }),
    });
    const json = (await res.json()) as NotebookExtractApiResponse;
    if (!res.ok) {
      return doc;
    }

    const combined = json.combinedText?.trim();
    if (combined && json.useful) {
      return { ...doc, extracted_text: combined };
    }
  } catch {
    return doc;
  }

  return doc;
}

export async function resolveNotebookDocumentsExtractedText(
  client: SupabaseClient,
  docs: NotebookDocumentRow[],
): Promise<NotebookDocumentRow[]> {
  return Promise.all(docs.map((doc) => resolveNotebookDocumentExtractedText(client, doc)));
}

/** Server-side extract with user-visible error message when extraction fails. */
export async function resolveNotebookDocumentsExtractedTextWithHint(
  client: SupabaseClient,
  docs: NotebookDocumentRow[],
): Promise<{ docs: NotebookDocumentRow[]; extractHint: string | null }> {
  const resolved = await resolveNotebookDocumentsExtractedText(client, docs);
  const stillEmpty = resolved.filter((d) => !isUsefulExtractedText(d.extracted_text ?? ""));
  if (stillEmpty.length === 0) {
    return { docs: resolved, extractHint: null };
  }

  const names = stillEmpty.map((d) => d.filename).join(", ");
  return {
    docs: resolved,
    extractHint:
      `No pudimos extraer texto útil de: ${names}. ` +
      "Comprueba OPENAI_API_KEY en Vercel, que el archivo sea legible (PDF escaneado o foto nítida) " +
      "y que no superes la cuota diaria de extracción.",
  };
}
