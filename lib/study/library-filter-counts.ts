import type { NotebookCardInsight } from "@/lib/study/notebook-insights";

export type LibraryFilter = "all" | "empty" | "exam" | "unlinked";

export type LibraryFilterCounts = Record<LibraryFilter, number>;

export function buildLibraryFilterCounts(insights: NotebookCardInsight[]): LibraryFilterCounts {
  return {
    all: insights.length,
    empty: insights.filter((i) => i.status === "empty").length,
    unlinked: insights.filter((i) => i.status === "unlinked").length,
    exam: insights.filter((i) => i.examDays !== null && i.examDays <= 14).length,
  };
}
