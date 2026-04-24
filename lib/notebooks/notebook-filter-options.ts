import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import { subjectToPathSegment } from "@/lib/notebooks/paths";

export type NotebookTagRow = Pick<NotebookDocumentRow, "subject" | "topic" | "lesson_point" | "practice_exercises">;

export type NotebookTagOptions = {
  /** Materias del perfil + las que aparecen en documentos. */
  subjects: string[];
  topics: string[];
  lessonPoints: string[];
  practiceExercises: string[];
};

function uniqSorted(vals: string[]): string[] {
  const s = new Set(vals.map((v) => v.trim()).filter(Boolean));
  return Array.from(s).sort((a, b) => a.localeCompare(b, "es"));
}

/** Misma idea que al agrupar cuadernos: slug o texto sin acentos case-insensitive. */
export function notebookSubjectsMatch(docSubject: string, focus: string): boolean {
  const a = docSubject.trim();
  const b = focus.trim();
  if (!a || !b) return false;
  if (a.toLowerCase() === b.toLowerCase()) return true;
  return subjectToPathSegment(a) === subjectToPathSegment(b);
}

/**
 * Sugerencias de Tema / Punto / Ejercicios a partir de las hojas ya subidas.
 * Si `focusSubject` está vacío, se consideran todas las hojas (puede ser lista larga).
 */
export function buildNotebookTagOptions(rows: NotebookTagRow[], profileSubjects: string[], focusSubject: string): NotebookTagOptions {
  const fromProfile = profileSubjects.map((s) => s.trim()).filter(Boolean);
  const fromDocs = rows.map((r) => r.subject.trim()).filter(Boolean);
  const subjects = uniqSorted([...fromProfile, ...fromDocs]);

  const focus = focusSubject.trim();
  const subset = focus ? rows.filter((r) => notebookSubjectsMatch(r.subject, focus)) : rows;

  return {
    subjects,
    topics: uniqSorted(subset.map((r) => r.topic ?? "")),
    lessonPoints: uniqSorted(subset.map((r) => r.lesson_point ?? "")),
    practiceExercises: uniqSorted(subset.map((r) => r.practice_exercises ?? "")),
  };
}
