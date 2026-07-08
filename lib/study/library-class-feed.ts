import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import type { ClassScheduleRow } from "@/lib/schemas/class-schedule";
import { localIsoDate } from "@/lib/calendar/local-iso-date";
import { subjectToPathSegment } from "@/lib/notebooks/paths";
import { buildNotebookClassSummaries } from "@/lib/study/notebook-class-summary";
import { buildCalendarUploadNotebookHref } from "@/lib/study/notebook-insights";
import { buildPressureQuizPath } from "@/lib/study/pressure-quiz";
import { buildTodayClassSlots } from "@/lib/today/today-classes";

export type LibraryClassFeedStatus = "ready" | "missing" | "unlinked";

export type LibraryClassFeedItem = {
  id: string;
  subject: string;
  classDate: string | null;
  scheduleId?: string | null;
  topic?: string | null;
  label: string;
  pageCount: number;
  status: LibraryClassFeedStatus;
  openHref: string;
  uploadHref: string;
  quizHref: string;
  sortKey: string;
};

function notebookUploadHref(subject: string): string {
  return `/study/notebook/${subjectToPathSegment(subject)}?upload=1`;
}

/** All class sessions across notebooks, plus today's scheduled classes without notes. */
export function buildLibraryClassFeed(
  notebooks: { subject: string; pages: NotebookDocumentRow[] }[],
  options?: {
    schedule?: ClassScheduleRow[];
    limit?: number;
  },
): LibraryClassFeedItem[] {
  const limit = options?.limit ?? 30;
  const items: LibraryClassFeedItem[] = [];
  const seenClassKeys = new Set<string>();

  for (const nb of notebooks) {
    for (const summary of buildNotebookClassSummaries(nb.pages, nb.subject)) {
      if (summary.classDate) {
        seenClassKeys.add(`${nb.subject}:${summary.scheduleId ?? ""}:${summary.classDate}`);
      }
      items.push({
        id: `${nb.subject}:${summary.key}`,
        subject: nb.subject,
        classDate: summary.classDate,
        label: summary.label,
        pageCount: summary.pageCount,
        status: summary.classDate ? "ready" : "unlinked",
        openHref: summary.openHref,
        uploadHref: notebookUploadHref(nb.subject),
        quizHref: buildPressureQuizPath(nb.subject),
        sortKey: summary.classDate ?? "0000-00-00",
      });
    }
  }

  const schedule = options?.schedule ?? [];
  const docs = notebooks.flatMap((n) => n.pages);
  const today = localIsoDate();
  const todaySlots = buildTodayClassSlots(schedule, docs, new Date(`${today}T12:00:00`));

  for (const slot of todaySlots) {
    if (slot.hasNotesForToday) continue;
    const key = `${slot.subject}:${slot.id}:${slot.classDate}`;
    if (seenClassKeys.has(key)) continue;

    const uploadHref = buildCalendarUploadNotebookHref({
      subject: slot.subject,
      scheduleId: slot.id,
      classDate: slot.classDate,
      topic: "Clase",
    });

    items.push({
      id: `missing:${key}`,
      subject: slot.subject,
      classDate: slot.classDate,
      scheduleId: slot.id,
      topic: "Clase",
      label: `Clase hoy ${slot.startTime}–${slot.endTime}${slot.location ? ` · ${slot.location}` : ""}`,
      pageCount: 0,
      status: "missing",
      openHref: uploadHref,
      uploadHref,
      quizHref: buildPressureQuizPath(slot.subject),
      sortKey: `${slot.classDate}:${slot.startTime}`,
    });
  }

  return items
    .sort((a, b) => {
      if (a.status === "missing" && b.status !== "missing") return -1;
      if (b.status === "missing" && a.status !== "missing") return 1;
      return b.sortKey.localeCompare(a.sortKey);
    })
    .slice(0, limit);
}

export function filterClassFeedBySearch(items: LibraryClassFeedItem[], query: string): LibraryClassFeedItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) => item.subject.toLowerCase().includes(q) || item.label.toLowerCase().includes(q),
  );
}
