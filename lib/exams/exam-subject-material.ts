import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import { filterDocsForSubject, describePressureQuizSources } from "@/lib/study/pressure-quiz";

export type ExamSubjectMaterialStatus = {
  pageCount: number;
  linkedCount: number;
  hasRealMaterial: boolean;
  summary: string;
};

export function buildExamSubjectMaterialStatus(
  docs: NotebookDocumentRow[],
  subject: string,
): ExamSubjectMaterialStatus {
  const subjectDocs = filterDocsForSubject(docs, subject);
  const pageCount = subjectDocs.length;
  const linkedCount = subjectDocs.filter((d) => d.schedule_id || d.class_date).length;
  const hasRealMaterial = pageCount > 0;

  return {
    pageCount,
    linkedCount,
    hasRealMaterial,
    summary: hasRealMaterial ? describePressureQuizSources(subjectDocs) : "",
  };
}
