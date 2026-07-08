import type { RescueQuizItem } from "@/lib/class-rescue";
import { combineNotebookExtractedTextForPack } from "@/lib/notebooks/document-tags";
import { subjectToPathSegment } from "@/lib/notebooks/paths";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import type { PassModePlan, StudyBlock } from "@/lib/pass-mode";
import type { UserProfile } from "@/lib/schemas/profile";

export function getPressureQuizBlock(plan: PassModePlan): StudyBlock | undefined {
  return plan.sequence.find((b) => b.id === "quiz");
}

export function buildPressureQuizPath(subject: string, minutes?: number): string {
  const params = new URLSearchParams({ subject: subject.trim() || "General" });
  if (minutes && minutes > 0) params.set("minutes", String(minutes));
  return `/pass-mode/quiz?${params.toString()}`;
}

/** Abre el lector del cuaderno en un apunte concreto (query `doc`). Con `openKit`, genera el kit al llegar. */
export function buildNotebookReviewHref(
  subject: string,
  documentId?: string | null,
  options?: { openKit?: boolean },
): string {
  const slug = subjectToPathSegment(subject);
  const params = new URLSearchParams();
  if (documentId?.trim()) params.set("doc", documentId.trim());
  if (options?.openKit) params.set("kit", "1");
  const qs = params.toString();
  return qs ? `/study/notebook/${slug}?${qs}` : `/study/notebook/${slug}`;
}

export function filterDocsForSubject(docs: NotebookDocumentRow[], subject: string): NotebookDocumentRow[] {
  const key = subject.trim().toLowerCase() || "general";
  return docs.filter((d) => ((d.subject || "General").trim() || "General").toLowerCase() === key);
}

/** Prefer apuntes vinculados a clases del calendario; si no hay, los más recientes del cuaderno. */
export function selectDocsForPressureQuiz(docs: NotebookDocumentRow[]): NotebookDocumentRow[] {
  const withClass = docs.filter((d) => d.schedule_id || d.class_date);
  const pool = withClass.length > 0 ? withClass : docs;
  return [...pool].sort((a, b) => {
    const da = a.class_date || a.updated_at || a.created_at;
    const db = b.class_date || b.updated_at || b.created_at;
    return db.localeCompare(da);
  });
}

export function describePressureQuizSources(docs: NotebookDocumentRow[]): string {
  if (docs.length === 0) return "Sin apuntes en el cuaderno";
  const classDates = [...new Set(docs.map((d) => d.class_date).filter(Boolean))] as string[];
  if (classDates.length > 0) {
    const sorted = classDates.sort((a, b) => b.localeCompare(a));
    const shown = sorted.slice(0, 3).join(", ");
    const extra = sorted.length > 3 ? ` (+${sorted.length - 3} clases)` : "";
    return `${docs.length} apunte${docs.length === 1 ? "" : "s"} · clases: ${shown}${extra}`;
  }
  return `${docs.length} apunte${docs.length === 1 ? "" : "s"} del cuaderno`;
}

export function buildDemoSeedForSubject(subject: string, profile: UserProfile): string {
  const lines = [`Materia: ${subject}`];
  const exam = profile.upcomingExams.find((e) => e.subject.toLowerCase() === subject.toLowerCase());
  if (exam) lines.push(`Próximo examen: ${exam.date}`);
  if (profile.weakTopics.length) lines.push(`Temas débiles: ${profile.weakTopics.join(", ")}`);
  lines.push(
    "Genera preguntas tipo examen sobre los conceptos centrales de esta materia según el perfil del estudiante.",
  );
  return lines.join("\n");
}

export function formatClassDateLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export type ClassDocGroup = {
  key: string;
  classDate: string | null;
  classLabel: string;
  docs: NotebookDocumentRow[];
};

/** Agrupa apuntes por fecha de clase; los sueltos van por archivo. */
export function groupDocsByClass(docs: NotebookDocumentRow[]): ClassDocGroup[] {
  const map = new Map<string, NotebookDocumentRow[]>();
  for (const d of docs) {
    const key = d.class_date?.trim() || `__file__:${d.id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }

  return [...map.entries()]
    .map(([key, groupDocs]) => {
      const classDate = key.startsWith("__file__:") ? null : key;
      const first = groupDocs[0]!;
      const topic = (first.topic ?? first.lesson_point ?? "").trim();
      const classLabel = classDate
        ? `Clase ${formatClassDateLabel(classDate)}${topic ? ` · ${topic}` : ""}`
        : `Apunte · ${first.filename.replace(/\.[^.]+$/, "")}`;
      return { key, classDate, classLabel, docs: groupDocs };
    })
    .sort((a, b) => {
      if (a.classDate && b.classDate) return b.classDate.localeCompare(a.classDate);
      if (a.classDate) return -1;
      if (b.classDate) return 1;
      return 0;
    });
}

export function tagQuizWithSource(
  items: RescueQuizItem[],
  group: ClassDocGroup,
  limit: number,
): RescueQuizItem[] {
  const primary = group.docs[0];
  const filename = primary?.filename;
  const documentId = primary?.id;
  return items.slice(0, limit).map((q) => ({
    ...q,
    sourceClassLabel: group.classLabel,
    sourceClassDate: group.classDate,
    sourceFilename: filename,
    sourceDocumentId: documentId,
  }));
}

export function listUniqueClassLabels(questions: RescueQuizItem[]): string[] {
  return [...new Set(questions.map((q) => q.sourceClassLabel).filter(Boolean))] as string[];
}

export function buildPressureQuizPackInput(
  subject: string,
  docs: NotebookDocumentRow[],
  profile: UserProfile,
): {
  extractedFileText: string;
  sourceLabel: string;
  fallbackSeed: string;
  isDemoSource: boolean;
} {
  const selected = selectDocsForPressureQuiz(docs);
  const combined = combineNotebookExtractedTextForPack(selected);
  const hasText = combined.replace(/\(sin texto extraído[^)]*\)/g, "").trim().length > 80;

  if (hasText) {
    return {
      extractedFileText: combined,
      sourceLabel: describePressureQuizSources(selected),
      fallbackSeed: combined,
      isDemoSource: false,
    };
  }

  const demoSeed = buildDemoSeedForSubject(subject, profile);
  return {
    extractedFileText: demoSeed,
    sourceLabel: "Perfil demo (sube apuntes al cuaderno para preguntas reales)",
    fallbackSeed: demoSeed,
    isDemoSource: true,
  };
}
