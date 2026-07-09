import type { SupabaseClient } from "@supabase/supabase-js";

import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import { isUsefulExtractedText } from "@/lib/rescue/extract-text-quality";

type NotebookExtractApiResponse = {
  combinedText?: string;
  useful?: boolean;
  cached?: boolean;
  hint?: string;
  error?: string;
};

type ExtractAttempt = {
  doc: NotebookDocumentRow;
  error: string | null;
  hint: string | null;
};

async function runNotebookExtract(documentId: string, force: boolean): Promise<{
  combinedText: string | null;
  useful: boolean;
  error: string | null;
  hint: string | null;
}> {
  try {
    const res = await fetch("/api/notebooks/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, force }),
    });
    const json = (await res.json()) as NotebookExtractApiResponse;

    if (!res.ok) {
      return {
        combinedText: null,
        useful: false,
        error: json.error || `No se pudo extraer el texto (HTTP ${res.status}).`,
        hint: null,
      };
    }

    return {
      combinedText: json.combinedText?.trim() ?? null,
      useful: Boolean(json.useful),
      error: null,
      hint:
        json.hint ||
        (json.useful
          ? null
          : "OpenAI no encontró texto legible. Prueba una foto más nítida o un PDF con texto seleccionable."),
    };
  } catch (e) {
    return {
      combinedText: null,
      useful: false,
      error: e instanceof Error ? e.message : "Error de red al extraer el texto.",
      hint: null,
    };
  }
}

/**
 * Uses cached `extracted_text` when useful; otherwise runs server-side extraction
 * from Storage (`/api/notebooks/extract`) — no 4 MB upload limit.
 */
export async function resolveNotebookDocumentExtractedText(
  client: SupabaseClient,
  doc: NotebookDocumentRow,
  options?: { force?: boolean },
): Promise<NotebookDocumentRow> {
  const force = options?.force ?? false;
  if (!force && isUsefulExtractedText(doc.extracted_text ?? "")) {
    return doc;
  }

  const result = await runNotebookExtract(doc.id, force);
  if (result.combinedText && result.useful) {
    return { ...doc, extracted_text: result.combinedText };
  }
  return doc;
}

export async function resolveNotebookDocumentsExtractedText(
  client: SupabaseClient,
  docs: NotebookDocumentRow[],
  options?: { force?: boolean },
): Promise<NotebookDocumentRow[]> {
  return Promise.all(docs.map((doc) => resolveNotebookDocumentExtractedText(client, doc, options)));
}

/** Server-side extract with user-visible error message when extraction fails. */
export async function resolveNotebookDocumentsExtractedTextWithHint(
  client: SupabaseClient,
  docs: NotebookDocumentRow[],
): Promise<{ docs: NotebookDocumentRow[]; extractHint: string | null }> {
  const attempts: ExtractAttempt[] = [];

  for (const doc of docs) {
    const result = await runNotebookExtract(doc.id, true);
    if (result.combinedText && result.useful) {
      attempts.push({
        doc: { ...doc, extracted_text: result.combinedText },
        error: null,
        hint: null,
      });
      continue;
    }

    attempts.push({
      doc,
      error: result.error,
      hint: result.hint,
    });
  }

  const resolved = attempts.map((a) => a.doc);
  const errors = attempts.filter((a) => a.error).map((a) => `${a.doc.filename}: ${a.error}`);
  if (errors.length > 0) {
    return { docs: resolved, extractHint: errors.join(" ") };
  }

  const stillEmpty = resolved.filter((d) => !isUsefulExtractedText(d.extracted_text ?? ""));
  if (stillEmpty.length === 0) {
    return { docs: resolved, extractHint: null };
  }

  const hints = attempts.filter((a) => a.hint).map((a) => `${a.doc.filename}: ${a.hint}`);
  if (hints.length > 0) {
    return { docs: resolved, extractHint: hints.join(" ") };
  }

  const names = stillEmpty.map((d) => d.filename).join(", ");
  return {
    docs: resolved,
    extractHint:
      `No pudimos extraer texto útil de: ${names}. ` +
      "Comprueba que la imagen sea nítida y que tengas cuota diaria disponible.",
  };
}
