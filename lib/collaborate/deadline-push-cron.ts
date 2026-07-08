import { localIsoDate } from "@/lib/calendar/local-iso-date";
import { daysUntilDueIso } from "@/lib/collaborate/presentation-urgency";
import {
  buildDeadlineNotifyBody,
  urgentCollaborationDeadlines,
} from "@/lib/collaborate/deadline-notify";
import type { CollaborationFocusItem } from "@/lib/collaborate/collaboration-deadlines";
import { isStudentWorkCompleted, type StudentWork } from "@/lib/schemas/student-work";
import type { PresentationDeckSummary } from "@/lib/supabase/agenda-db";

export function focusItemsFromWorksAndPresentations(
  works: StudentWork[],
  presentations: PresentationDeckSummary[],
): CollaborationFocusItem[] {
  const workItems = works
    .filter((w) => !isStudentWorkCompleted(w) && w.dueDate?.trim())
    .map((w) => ({
      kind: "work" as const,
      title: w.title,
      date: w.dueDate,
      href: `/collaborate/investigaciones`,
      daysUntil: daysUntilDueIso(w.dueDate) ?? 999,
    }));

  const presItems = presentations
    .filter((s) => s.presentationDueDate?.trim())
    .map((s) => ({
      kind: "presentation" as const,
      title: s.deckTitle.trim() || "Exposición",
      date: s.presentationDueDate!.trim(),
      href: `/collaborate/exposiciones`,
      daysUntil: daysUntilDueIso(s.presentationDueDate!.trim()) ?? 999,
    }));

  return [...workItems, ...presItems];
}

export function buildDeadlinePushPayload(items: CollaborationFocusItem[]): { title: string; body: string; url: string } | null {
  const urgent = urgentCollaborationDeadlines(items);
  if (urgent.length === 0) return null;
  return {
    title: urgent.length === 1 ? "Entrega próxima" : `${urgent.length} entregas próximas`,
    body: buildDeadlineNotifyBody(urgent),
    url: "/collaborate",
  };
}

export function todayIsoForCron(): string {
  return localIsoDate();
}
