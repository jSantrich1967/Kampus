import type { Exam } from "@/lib/schemas/exams";
import { isDemoExamTitle } from "@/lib/storage/exams-storage";

type UpcomingExamEntry = { subject: string; date: string };

function upcomingKey(entry: UpcomingExamEntry): string {
  return `${entry.subject.trim().toLowerCase()}|${entry.date}`;
}

/**
 * Merge agenda exam due dates into profile.upcomingExams (agenda wins on conflict).
 * Los exámenes demo sembrados automáticamente ("(demo)") NO entran al perfil y
 * las entradas que hayan quedado de sincronizaciones anteriores se purgan:
 * /today no debe presentarlos como exámenes reales del usuario.
 */
export function mergeUpcomingExamsIntoProfile(
  profileExams: UpcomingExamEntry[],
  agendaExams: Exam[],
): UpcomingExamEntry[] {
  const demoKeys = new Set(
    agendaExams
      .filter((e) => isDemoExamTitle(e.title ?? "") && e.dueDate?.trim())
      .map((e) => upcomingKey({ subject: e.subject.trim(), date: e.dueDate!.trim() })),
  );
  const realKeys = new Set(
    agendaExams
      .filter((e) => e.status !== "draft" && e.dueDate?.trim() && !isDemoExamTitle(e.title ?? ""))
      .map((e) => upcomingKey({ subject: e.subject.trim(), date: e.dueDate!.trim() })),
  );
  const fromAgenda = agendaExams
    .filter((e) => e.status !== "draft" && e.dueDate?.trim() && !isDemoExamTitle(e.title ?? ""))
    .map((e) => ({ subject: e.subject.trim(), date: e.dueDate!.trim() }));

  const map = new Map<string, UpcomingExamEntry>();
  for (const entry of profileExams) {
    if (!entry.subject.trim() || !entry.date.trim()) continue;
    const key = upcomingKey(entry);
    // Purga: la entrada vino de un examen demo (misma materia+fecha) y no hay
    // un examen real que la respalde.
    if (demoKeys.has(key) && !realKeys.has(key)) continue;
    map.set(key, { subject: entry.subject.trim(), date: entry.date.trim() });
  }
  for (const entry of fromAgenda) {
    map.set(upcomingKey(entry), entry);
  }

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function upcomingExamsEqual(a: UpcomingExamEntry[], b: UpcomingExamEntry[]): boolean {
  if (a.length !== b.length) return false;
  const keysA = a.map(upcomingKey).sort();
  const keysB = b.map(upcomingKey).sort();
  return keysA.every((k, i) => k === keysB[i]);
}
