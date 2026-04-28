import type { Exam } from "@/lib/schemas/exams";
import type { StudentWork } from "@/lib/schemas/student-work";

export type AgendaKind = "exam" | "presentation" | "work" | "class";

export type AgendaEvent = {
  id: string;
  kind: AgendaKind;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  subject: string;
  href: string;
};

export function buildAgendaEvents(params: {
  exams: Exam[];
  presentationTitle: string;
  presentationDueDate: string | undefined;
  works: StudentWork[];
}): AgendaEvent[] {
  const out: AgendaEvent[] = [];

  for (const e of params.exams) {
    if (!e.dueDate) continue;
    if (e.status === "draft") continue;
    out.push({
      id: `exam:${e.id}`,
      kind: "exam",
      date: e.dueDate,
      title: e.title,
      subject: e.subject,
      href: `/exams/student/${e.id}`,
    });
  }

  const pd = params.presentationDueDate?.trim();
  if (pd) {
    out.push({
      id: "presentation:deck",
      kind: "presentation",
      date: pd,
      title: params.presentationTitle.trim() || "Mis exposiciones",
      subject: "Exposición",
      href: "/collaborate/exposiciones",
    });
  }

  for (const w of params.works) {
    out.push({
      id: `work:${w.id}`,
      kind: "work",
      date: w.dueDate,
      title: w.title,
      subject: w.subject,
      href: "/collaborate/investigaciones",
    });
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

/** Monday = 0 … Sunday = 6 (week row starts Monday). */
export function mondayIndexFromDate(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function monthMatrix(year: number, monthIndex0: number): (number | null)[][] {
  const first = new Date(year, monthIndex0, 1);
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  const pad = mondayIndexFromDate(first);
  const cells: (number | null)[] = [];
  for (let i = 0; i < pad; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}
