import type { PassModePlan, StudyBlock } from "@/lib/pass-mode";
import { subjectToPathSegment } from "@/lib/notebooks/paths";
import { buildPassModeFlashcardsPath } from "@/lib/study/plan-flashcards";
import { buildPressureQuizPath } from "@/lib/study/pressure-quiz";

/** Deep link for a pass-mode study block from Hoy or Modo aprobar. */
export function getStudyBlockActionHref(block: StudyBlock): string {
  const slug = subjectToPathSegment(block.subject);

  switch (block.id) {
    case "quiz":
      return buildPressureQuizPath(block.subject, block.minutes);
    case "flashcards":
      return buildPassModeFlashcardsPath(block.subject, block.minutes);
    case "warmup":
      return `/study/notebook/${slug}?kit=1`;
    case "deep": {
      const params = new URLSearchParams({ kit: "1" });
      if (block.focus.trim()) params.set("focus", block.focus.trim());
      return `/study/notebook/${slug}?${params.toString()}`;
    }
    case "secondary":
      return `/study/notebook/${slug}?kit=1`;
    case "close":
      return "/pass-mode#close-cycle";
    default:
      return "/pass-mode";
  }
}

export function getStudyBlockActionLabel(block: StudyBlock): string {
  switch (block.id) {
    case "quiz":
      return "Iniciar quiz de presión";
    case "flashcards":
      return "Abrir tarjetas del plan";
    case "warmup":
      return "Calentar con kit";
    case "deep":
      return "Estudiar en profundidad";
    case "secondary":
      return "Repasar materia secundaria";
    case "close":
      return "Cerrar el ciclo";
    default:
      return "Abrir Modo aprobar";
  }
}

export function getFirstOpenBlock(plan: PassModePlan, completedIds: string[]): StudyBlock | undefined {
  const done = new Set(completedIds);
  return plan.sequence.find((b) => !done.has(b.id)) ?? plan.sequence[plan.sequence.length - 1];
}

export function buildPassModeSubjectHref(subject: string, from?: "kit" | "rescue"): string {
  const params = new URLSearchParams({ subject });
  if (from) params.set("from", from);
  return `/pass-mode?${params.toString()}`;
}
