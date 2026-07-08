import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import type { NotebookCardInsight } from "@/lib/study/notebook-insights";

export type NotebookSortMode = "priority" | "recent" | "name";

export function sortNotebookList<T extends { subject: string; pages: NotebookDocumentRow[] }>(
  list: T[],
  mode: NotebookSortMode,
  insightBySubject: Map<string, NotebookCardInsight>,
): T[] {
  const copy = [...list];
  if (mode === "name") {
    return copy.sort((a, b) => a.subject.localeCompare(b.subject, "es"));
  }
  if (mode === "recent") {
    return copy.sort((a, b) => {
      const ta = insightBySubject.get(a.subject)?.lastEditIso ?? "";
      const tb = insightBySubject.get(b.subject)?.lastEditIso ?? "";
      return tb.localeCompare(ta) || a.subject.localeCompare(b.subject, "es");
    });
  }
  return copy.sort((a, b) => {
    const pa = insightBySubject.get(a.subject)?.priorityScore ?? 0;
    const pb = insightBySubject.get(b.subject)?.priorityScore ?? 0;
    return pb - pa || a.subject.localeCompare(b.subject, "es");
  });
}

export function notebookMatchesSearch(
  notebook: { subject: string; pages: NotebookDocumentRow[] },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (notebook.subject.toLowerCase().includes(q)) return true;
  return notebook.pages.some((p) => {
    const filename = (p.filename ?? "").toLowerCase();
    const topic = (p.topic ?? "").toLowerCase();
    const lesson = (p.lesson_point ?? "").toLowerCase();
    const classDate = (p.class_date ?? "").toLowerCase();
    return filename.includes(q) || topic.includes(q) || lesson.includes(q) || classDate.includes(q);
  });
}

export function recentEditedInsights(
  insights: NotebookCardInsight[],
  limit = 4,
): NotebookCardInsight[] {
  return [...insights]
    .filter((i) => i.lastEditIso)
    .sort((a, b) => (b.lastEditIso ?? "").localeCompare(a.lastEditIso ?? ""))
    .slice(0, limit);
}
