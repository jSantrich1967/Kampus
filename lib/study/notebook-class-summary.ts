import { subjectToPathSegment } from "@/lib/notebooks/paths";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import { formatClassDateLabel } from "@/lib/study/pressure-quiz";

export type NotebookClassSummary = {
  key: string;
  classDate: string | null;
  scheduleId: string | null;
  pageCount: number;
  topic: string | null;
  label: string;
  firstDocId: string;
  openHref: string;
};

export type NotebookSubjectStats = {
  totalPages: number;
  linkedPages: number;
  unlinkedPages: number;
  classSessionCount: number;
};

export function buildNotebookSubjectStats(pages: NotebookDocumentRow[]): NotebookSubjectStats {
  const linkedPages = pages.filter((p) => p.schedule_id || p.class_date).length;
  const classKeys = new Set(
    pages
      .filter((p) => p.class_date?.trim())
      .map((p) => `${p.schedule_id ?? ""}:${p.class_date}`),
  );
  return {
    totalPages: pages.length,
    linkedPages,
    unlinkedPages: pages.length - linkedPages,
    classSessionCount: classKeys.size,
  };
}

/** Groups pages by class session (class_date + schedule_id), newest first. */
export function buildNotebookClassSummaries(
  pages: NotebookDocumentRow[],
  subject: string,
): NotebookClassSummary[] {
  const slug = subjectToPathSegment(subject);
  const map = new Map<string, NotebookDocumentRow[]>();

  for (const page of pages) {
    const classDate = page.class_date?.trim() || null;
    const scheduleId = page.schedule_id?.trim() || null;
    const key = classDate ? `${scheduleId ?? "none"}:${classDate}` : `upload:${page.id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(page);
  }

  const summaries = [...map.entries()].map(([key, groupPages]) => {
    const sorted = [...groupPages].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const first = sorted[0]!;
    const classDate = first.class_date?.trim() || null;
    const scheduleId = first.schedule_id?.trim() || null;
    const topic = (first.topic ?? first.lesson_point ?? "").trim() || null;

    const label = classDate
      ? `Clase ${formatClassDateLabel(classDate)}${topic ? ` · ${topic}` : ""}`
      : `Apunte · ${first.filename.replace(/\.[^.]+$/, "")}`;

    const params = new URLSearchParams({ doc: first.id });
    if (classDate) params.set("classDate", classDate);

    return {
      key,
      classDate,
      scheduleId,
      pageCount: sorted.length,
      topic,
      label,
      firstDocId: first.id,
      openHref: `/study/notebook/${slug}?${params.toString()}`,
    };
  });

  return summaries.sort((a, b) => {
    if (a.classDate && b.classDate) return b.classDate.localeCompare(a.classDate);
    if (a.classDate) return -1;
    if (b.classDate) return 1;
    return 0;
  });
}

export function recentClassSummaries(summaries: NotebookClassSummary[], limit = 3): NotebookClassSummary[] {
  return summaries.filter((s) => s.classDate).slice(0, limit);
}
