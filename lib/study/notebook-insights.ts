import { daysUntilCalendarDate } from "@/lib/calendar/local-iso-date";
import { subjectToPathSegment } from "@/lib/notebooks/paths";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import type { UserProfile } from "@/lib/schemas/profile";
import { buildPressureQuizPath } from "@/lib/study/pressure-quiz";

export type NotebookHealthStatus = "empty" | "unlinked" | "ready";

export type NotebookCardInsight = {
  subject: string;
  slug: string;
  pageCount: number;
  linkedCount: number;
  status: NotebookHealthStatus;
  examDays: number | null;
  priorityScore: number;
  lastEditIso?: string;
  href: string;
  uploadHref: string;
  quizHref: string;
  kitHref: string;
  statusLabel: string;
  nextActionLabel: string;
  nextActionHref: string;
};

function docsForSubject(docs: NotebookDocumentRow[], subject: string): NotebookDocumentRow[] {
  const key = subject.trim().toLowerCase() || "general";
  return docs.filter(
    (d) => ((d.subject || "General").trim() || "General").toLowerCase() === key,
  );
}

function latestEditIso(pages: NotebookDocumentRow[]): string | undefined {
  if (!pages.length) return undefined;
  return pages.reduce((latest, p) => {
    const t = p.updated_at ?? p.created_at;
    if (!t) return latest;
    if (!latest) return t;
    return new Date(t) > new Date(latest) ? t : latest;
  }, undefined as string | undefined);
}

function examDaysForSubject(profile: UserProfile, subject: string): number | null {
  let best: number | null = null;
  for (const exam of profile.upcomingExams) {
    if (exam.subject.toLowerCase() !== subject.toLowerCase()) continue;
    const days = daysUntilCalendarDate(exam.date);
    if (days === null || days < 0) continue;
    if (best === null || days < best) best = days;
  }
  return best;
}

function statusMeta(status: NotebookHealthStatus): { label: string; scoreBoost: number } {
  if (status === "empty") return { label: "Vacío", scoreBoost: 80 };
  if (status === "unlinked") return { label: "Sin clase", scoreBoost: 45 };
  return { label: "Listo", scoreBoost: 0 };
}

export function buildNotebookCardInsight(
  subject: string,
  pages: NotebookDocumentRow[],
  profile: UserProfile,
): NotebookCardInsight {
  const slug = subjectToPathSegment(subject);
  const pageCount = pages.length;
  const linkedCount = pages.filter((d) => d.schedule_id || d.class_date).length;
  const status: NotebookHealthStatus =
    pageCount === 0 ? "empty" : linkedCount === 0 ? "unlinked" : "ready";
  const examDays = examDaysForSubject(profile, subject);
  const meta = statusMeta(status);

  let priorityScore = meta.scoreBoost;
  if (examDays !== null) {
    if (examDays <= 3) priorityScore += 35;
    else if (examDays <= 7) priorityScore += 25;
    else if (examDays <= 14) priorityScore += 12;
  }

  const href = `/study/notebook/${slug}`;
  const uploadHref = `${href}?upload=1`;
  const quizHref = buildPressureQuizPath(subject);
  const kitHref = `${href}?kit=1`;

  const nextAction =
    status === "empty"
      ? { label: "Subir apuntes", href: uploadHref }
      : status === "unlinked"
        ? { label: "Vincular clases", href: "/exams/calendar" }
        : { label: "Quiz de presión", href: quizHref };

  return {
    subject,
    slug,
    pageCount,
    linkedCount,
    status,
    examDays,
    priorityScore,
    lastEditIso: latestEditIso(pages),
    href,
    uploadHref,
    quizHref,
    kitHref,
    statusLabel: meta.label,
    nextActionLabel: nextAction.label,
    nextActionHref: nextAction.href,
  };
}

export function buildNotebookCardInsights(
  notebooks: { subject: string; pages: NotebookDocumentRow[] }[],
  profile: UserProfile,
): NotebookCardInsight[] {
  return notebooks
    .map((nb) => buildNotebookCardInsight(nb.subject, nb.pages, profile))
    .sort((a, b) => b.priorityScore - a.priorityScore || a.subject.localeCompare(b.subject, "es"));
}

export function pickNextNotebook(insights: NotebookCardInsight[]): NotebookCardInsight | null {
  if (!insights.length) return null;
  const urgent = insights.find((i) => i.status !== "ready" || (i.examDays !== null && i.examDays <= 7));
  return urgent ?? insights[0] ?? null;
}

export function buildCalendarUploadNotebookHref(input: {
  subject: string;
  scheduleId?: string | null;
  classDate?: string | null;
  topic?: string | null;
  lesson?: string | null;
}): string {
  const slug = subjectToPathSegment(input.subject);
  const params = new URLSearchParams({ upload: "1" });
  if (input.scheduleId?.trim()) params.set("scheduleId", input.scheduleId.trim());
  if (input.classDate?.trim()) params.set("classDate", input.classDate.trim());
  if (input.topic?.trim()) params.set("topic", input.topic.trim());
  if (input.lesson?.trim()) params.set("lesson", input.lesson.trim());
  return `/study/notebook/${slug}?${params.toString()}`;
}

/** Group docs by subject key for insight building. */
export function groupDocsBySubject(docs: NotebookDocumentRow[]): Map<string, NotebookDocumentRow[]> {
  const map = new Map<string, NotebookDocumentRow[]>();
  for (const d of docs) {
    const key = (d.subject || "General").trim() || "General";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }
  return map;
}

export function docsForSubjectFromMap(map: Map<string, NotebookDocumentRow[]>, subject: string): NotebookDocumentRow[] {
  return docsForSubject([...map.values()].flat(), subject);
}
