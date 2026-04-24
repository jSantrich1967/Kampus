import type { NotebookDocumentRow } from "@/lib/notebooks/types";

export type NotebookTagFilters = {
  topic: string;
  lessonPoint: string;
  practiceExercises: string;
};

/** Empty filter field = wildcard (no constraint on that dimension). */
export function documentMatchesTagFilters(doc: NotebookDocumentRow, filters: NotebookTagFilters): boolean {
  const t = filters.topic.trim().toLowerCase();
  const p = filters.lessonPoint.trim().toLowerCase();
  const e = filters.practiceExercises.trim().toLowerCase();
  const docTopic = (doc.topic ?? "").trim().toLowerCase();
  const docPoint = (doc.lesson_point ?? "").trim().toLowerCase();
  const docEx = (doc.practice_exercises ?? "").trim().toLowerCase();
  if (t && !docTopic.includes(t)) return false;
  if (p && !docPoint.includes(p)) return false;
  if (e && !docEx.includes(e)) return false;
  return true;
}

export function filterDocumentsByTags(docs: NotebookDocumentRow[], filters: NotebookTagFilters): NotebookDocumentRow[] {
  return docs.filter((d) => documentMatchesTagFilters(d, filters));
}

/** Combined blob for `/api/rescue/pack` — includes materia / tema / punto / ejercicios in headers. */
export function combineNotebookExtractedTextForPack(docs: NotebookDocumentRow[]): string {
  return docs
    .map((d) => {
      const head: string[] = [`# ${d.filename}`];
      const tags: string[] = [`Materia: ${d.subject}`];
      const t = (d.topic ?? "").trim();
      const lp = (d.lesson_point ?? "").trim();
      const pe = (d.practice_exercises ?? "").trim();
      if (t) tags.push(`Tema: ${t}`);
      if (lp) tags.push(`Punto: ${lp}`);
      if (pe) tags.push(`Ejercicios prácticos: ${pe}`);
      head.push(tags.join("\n"));
      const body = d.extracted_text?.trim()
        ? d.extracted_text.trim()
        : "(sin texto extraído aún — puedes re-subir el archivo en Mis cuadernos)";
      head.push(body);
      return head.join("\n\n");
    })
    .join("\n\n");
}
