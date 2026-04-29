import type { NotebookDocumentRow } from "@/lib/notebooks/types";

export type NotebookIndexGroup = {
  dateKey: string;
  items: Array<{ page: NotebookDocumentRow; index0: number }>;
};

/**
 * Groups notebook pages by class_date (YYYY-MM-DD). If missing, falls back to created_at date.
 * Sorts groups by dateKey and items within a group by created_at ascending.
 */
export function buildNotebookIndexGroups(pages: NotebookDocumentRow[]): NotebookIndexGroup[] {
  const groups = new Map<string, Array<{ page: NotebookDocumentRow; index0: number }>>();
  pages.forEach((p, idx) => {
    const key = (p.class_date ?? "").trim() || p.created_at.slice(0, 10) || "Sin fecha";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ page: p, index0: idx });
  });

  const keys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));
  return keys.map((k) => ({
    dateKey: k,
    items: (groups.get(k) ?? []).slice().sort((a, b) => a.page.created_at.localeCompare(b.page.created_at)),
  }));
}
