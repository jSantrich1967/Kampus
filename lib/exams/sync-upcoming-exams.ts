import type { Exam } from "@/lib/schemas/exams";

type UpcomingExamEntry = { subject: string; date: string };

function upcomingKey(entry: UpcomingExamEntry): string {
  return `${entry.subject.trim().toLowerCase()}|${entry.date}`;
}

/** Merge agenda exam due dates into profile.upcomingExams (agenda wins on conflict). */
export function mergeUpcomingExamsIntoProfile(
  profileExams: UpcomingExamEntry[],
  agendaExams: Exam[],
): UpcomingExamEntry[] {
  const fromAgenda = agendaExams
    .filter((e) => e.status !== "draft" && e.dueDate?.trim())
    .map((e) => ({ subject: e.subject.trim(), date: e.dueDate!.trim() }));

  if (fromAgenda.length === 0) return profileExams;

  const map = new Map<string, UpcomingExamEntry>();
  for (const entry of profileExams) {
    if (!entry.subject.trim() || !entry.date.trim()) continue;
    map.set(upcomingKey(entry), { subject: entry.subject.trim(), date: entry.date.trim() });
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
