import { LOCAL_ONLY_PRESENTATION_ID } from "@/lib/calendar/agenda-events";
import { daysUntilDueIso } from "@/lib/collaborate/presentation-urgency";
import { buildPresentationDeckHref } from "@/lib/collaborate/presentation-path";
import { buildStudentWorkHref } from "@/lib/calendar/student-work-path";
import { isStudentWorkCompleted, type StudentWork } from "@/lib/schemas/student-work";
import { loadPresentation } from "@/lib/storage/presentation-storage";
import type { PresentationDeckSummary } from "@/lib/supabase/agenda-db";

export type CollaborationFocusItem = {
  kind: "work" | "presentation";
  title: string;
  date: string;
  href: string;
  daysUntil: number;
};

export function buildFocusItemsFromWorks(works: StudentWork[]): CollaborationFocusItem[] {
  return works
    .filter((w) => !isStudentWorkCompleted(w) && w.dueDate?.trim())
    .map((w) => {
      const days = daysUntilDueIso(w.dueDate) ?? 999;
      return {
        kind: "work" as const,
        title: w.title,
        date: w.dueDate,
        href: buildStudentWorkHref(w.id),
        daysUntil: days,
      };
    });
}

export function buildFocusItemsFromPresentations(summaries: PresentationDeckSummary[]): CollaborationFocusItem[] {
  return summaries
    .filter((s) => s.presentationDueDate?.trim())
    .map((s) => {
      const date = s.presentationDueDate!.trim();
      const days = daysUntilDueIso(date) ?? 999;
      return {
        kind: "presentation" as const,
        title: s.deckTitle.trim() || "Exposición",
        date,
        href: buildPresentationDeckHref(s.id),
        daysUntil: days,
      };
    });
}

export function buildFocusItemsFromLocalPresentation(): CollaborationFocusItem[] {
  const loc = loadPresentation();
  const date = loc.presentationDueDate?.trim();
  if (!date) return [];
  const days = daysUntilDueIso(date) ?? 999;
  return [
    {
      kind: "presentation",
      title: loc.deckTitle.trim() || "Exposición",
      date,
      href: buildPresentationDeckHref(LOCAL_ONLY_PRESENTATION_ID),
      daysUntil: days,
    },
  ];
}

export function pickNearestCollaborationFocus(items: CollaborationFocusItem[]): CollaborationFocusItem | null {
  if (items.length === 0) return null;
  return [...items].sort((a, b) => a.daysUntil - b.daysUntil || a.date.localeCompare(b.date))[0] ?? null;
}
