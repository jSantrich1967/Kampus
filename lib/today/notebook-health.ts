import { subjectToPathSegment } from "@/lib/notebooks/paths";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";

import type { TodayClassSlot } from "@/lib/today/today-classes";

export type NotebookHealthAlertKind = "empty" | "unlinked" | "class_missing_notes";

export type NotebookHealthAlert = {
  id: string;
  kind: NotebookHealthAlertKind;
  subject: string;
  title: string;
  description: string;
  href: string;
  priority: number;
};

function docsForSubject(docs: NotebookDocumentRow[], subject: string): NotebookDocumentRow[] {
  const key = subject.trim().toLowerCase() || "general";
  return docs.filter(
    (d) => ((d.subject || "General").trim() || "General").toLowerCase() === key,
  );
}

function examUrgencyBoost(subject: string, examDaysBySubject: Map<string, number>): number {
  const days = examDaysBySubject.get(subject);
  if (days === undefined) return 0;
  if (days <= 3) return 30;
  if (days <= 7) return 20;
  if (days <= 14) return 10;
  return 0;
}

export function buildNotebookHealthAlerts(input: {
  subjects: string[];
  docs: NotebookDocumentRow[];
  todayClasses: TodayClassSlot[];
  prioritySubjects?: string[];
  examDaysBySubject?: Map<string, number>;
  maxAlerts?: number;
}): NotebookHealthAlert[] {
  const {
    subjects,
    docs,
    todayClasses,
    prioritySubjects = [],
    examDaysBySubject = new Map(),
    maxAlerts = 4,
  } = input;

  const prioritySet = new Set(prioritySubjects.map((s) => s.toLowerCase()));
  const alerts: NotebookHealthAlert[] = [];
  const seen = new Set<string>();

  for (const slot of todayClasses) {
    if (slot.hasNotesForToday) continue;
    const key = `class:${slot.id}:${slot.classDate}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const afterClass = slot.status === "past";
    alerts.push({
      id: key,
      kind: "class_missing_notes",
      subject: slot.subject,
      title: afterClass
        ? `Sube apuntes de ${slot.subject}`
        : `Clase de ${slot.subject} hoy`,
      description: afterClass
        ? `Terminó la clase de ${slot.startTime}–${slot.endTime}. Sube material para que el quiz use contenido real.`
        : `${slot.startTime}–${slot.endTime}${slot.location ? ` · ${slot.location}` : ""}. Prepara el cuaderno para después de clase.`,
      href: slot.uploadHref,
      priority: 100 + (slot.status === "past" ? 5 : 0),
    });
  }

  const subjectList = [...new Set(subjects.filter(Boolean))];
  for (const subject of subjectList) {
    const subjectDocs = docsForSubject(docs, subject);
    const slug = subjectToPathSegment(subject);
    const boost = examUrgencyBoost(subject, examDaysBySubject);
    const isPriority = prioritySet.has(subject.toLowerCase());

    if (subjectDocs.length === 0) {
      const key = `empty:${subject}`;
      if (seen.has(key)) continue;
      seen.add(key);
      alerts.push({
        id: key,
        kind: "empty",
        subject,
        title: `Cuaderno de ${subject} vacío`,
        description: "Sin apuntes, el quiz usará material genérico. Sube PDFs o fotos desde Mis cuadernos.",
        href: `/study/notebook/${slug}`,
        priority: 80 + boost + (isPriority ? 10 : 0),
      });
      continue;
    }

    const linkedCount = subjectDocs.filter((d) => d.schedule_id || d.class_date).length;
    if (linkedCount === 0) {
      const key = `unlinked:${subject}`;
      if (seen.has(key)) continue;
      seen.add(key);
      alerts.push({
        id: key,
        kind: "unlinked",
        subject,
        title: `${subject}: apuntes sin clase`,
        description: `${subjectDocs.length} archivo${subjectDocs.length === 1 ? "" : "s"} sin vincular al calendario. Enlázalos para quizzes más precisos.`,
        href: `/exams/calendar`,
        priority: 50 + boost + (isPriority ? 5 : 0),
      });
    }
  }

  return alerts.sort((a, b) => b.priority - a.priority).slice(0, maxAlerts);
}
