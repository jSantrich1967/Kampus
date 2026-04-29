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
  /** Optional status text (e.g. cancellation reason). */
  note?: string;
};

/** Id fijo en cliente sin Supabase para una sola exposición en borrador local. */
export const LOCAL_ONLY_PRESENTATION_ID = "local-draft";

export type PresentationAgendaSlice = {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  dueDate?: string;
};

export function buildAgendaEvents(params: {
  exams: Exam[];
  /** Una entrada por exposición con fecha (calendario). */
  presentations: PresentationAgendaSlice[];
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

  for (const p of params.presentations) {
    const pd = p.dueDate?.trim();
    if (!pd) continue;
    out.push({
      id: `presentation:${p.id}`,
      kind: "presentation",
      date: pd,
      title: p.title.trim() || "Exposición",
      subject: "Exposición",
      href:
        p.id === LOCAL_ONLY_PRESENTATION_ID
          ? "/collaborate/exposiciones"
          : `/collaborate/exposiciones?deck=${encodeURIComponent(p.id)}`,
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
