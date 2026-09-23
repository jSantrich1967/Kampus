import type { PlanSession, PlanSubject } from "../storage/study-plan-storage";

const DAY_MS = 86_400_000;

/** Parse a YYYY-MM-DD string as a local calendar day (avoids UTC shifts). */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

/** Calendar days between two YYYY-MM-DD dates (end - start). */
export function diffDaysLocal(startIso: string, endIso: string): number {
  return Math.round((parseLocalDate(endIso).getTime() - parseLocalDate(startIso).getTime()) / DAY_MS);
}

function addDaysIso(iso: string, days: number): string {
  const d = parseLocalDate(iso);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

/**
 * Split `minutes` into blocks of 25–50 minutes, each one tied to a topic.
 * Topics rotate so every study session covers a different one.
 */
export function splitIntoBlocks(
  subject: PlanSubject,
  minutes: number,
): { topic: string; minutes: number }[] {
  if (minutes <= 0) return [];
  const n = Math.max(1, Math.round(minutes / 40));
  const perBlock = Math.round(minutes / n);
  const topics = subject.topics.length > 0 ? subject.topics : ["Repaso general"];
  const blocks: { topic: string; minutes: number }[] = [];
  let remaining = minutes;
  for (let i = 0; i < n; i++) {
    const m = i === n - 1 ? remaining : Math.min(perBlock, remaining);
    blocks.push({ topic: topics[i % topics.length] ?? "Repaso general", minutes: m });
    remaining -= m;
  }
  return blocks;
}

/**
 * Build a study plan from `fromDate` up to each subject's exam date.
 *
 * Each day: the daily minutes are shared among the subjects that still have
 * days left before their exam, proportionally to how close the exam is
 * (fewer days left → bigger share that day). No sessions are scheduled
 * after a subject's exam date.
 */
export function buildPlan(
  subjects: PlanSubject[],
  dailyHours: number,
  fromDate: string,
): PlanSession[] {
  const dailyMinutes = Math.max(1, Math.round(dailyHours * 60));
  const sessions: PlanSession[] = [];

  const active = subjects.filter((s) => diffDaysLocal(fromDate, s.examDate) >= 0);
  if (active.length === 0) return sessions;

  const lastDay = active
    .map((s) => s.examDate)
    .sort()
    .reverse()[0] as string;
  const totalDays = diffDaysLocal(fromDate, lastDay);

  for (let day = 0; day <= totalDays; day++) {
    const date = addDaysIso(fromDate, day);
    const dueToday = active.filter((s) => diffDaysLocal(date, s.examDate) >= 0);
    if (dueToday.length === 0) continue;

    // Closer exams get a bigger share of today's minutes.
    const weights = dueToday.map((s) => {
      const daysLeft = Math.max(1, diffDaysLocal(date, s.examDate));
      return { subject: s, weight: 1 / daysLeft };
    });
    const weightSum = weights.reduce((acc, w) => acc + w.weight, 0);

    for (const { subject, weight } of weights) {
      const minutes = Math.round((dailyMinutes * weight) / weightSum);
      for (const block of splitIntoBlocks(subject, minutes)) {
        sessions.push({
          id: uid("plan"),
          date,
          subjectId: subject.id,
          subjectName: subject.name,
          topic: block.topic,
          minutes: block.minutes,
          done: false,
        });
      }
    }
  }

  return sessions.sort((a, b) => a.date.localeCompare(b.date));
}

export type StudyPlanLike = {
  subjects: PlanSubject[];
  sessions: PlanSession[];
};

/**
 * Redistribute unfinished sessions whose date already passed (< `today`):
 * their minutes are spread evenly across the remaining days until each
 * subject's exam. Sessions for exams that already passed are left as-is.
 */
export function recalculatePlan<T extends StudyPlanLike>(plan: T, today: string): T["sessions"] {
  const keep = plan.sessions.filter((s) => s.done || s.date >= today);
  const overdue = plan.sessions.filter((s) => !s.done && s.date < today);

  const bySubject = new Map<string, PlanSession[]>();
  for (const s of overdue) {
    const list = bySubject.get(s.subjectId) ?? [];
    list.push(s);
    bySubject.set(s.subjectId, list);
  }

  const redistributed: PlanSession[] = [...keep];

  for (const [subjectId, list] of bySubject) {
    const subject = plan.subjects.find((s) => s.id === subjectId);
    if (!subject) continue;
    const daysLeft = diffDaysLocal(today, subject.examDate);
    if (daysLeft < 0) continue; // exam already passed — leave those sessions as they are

    const overdueMinutes = list.reduce((acc, s) => acc + s.minutes, 0);
    const span = daysLeft + 1; // includes today
    const perDay = Math.ceil(overdueMinutes / span);

    let remaining = overdueMinutes;
    for (let day = 0; day <= daysLeft && remaining > 0; day++) {
      const date = addDaysIso(today, day);
      const minutes = Math.min(perDay, remaining);
      remaining -= minutes;
      for (const block of splitIntoBlocks(subject, minutes)) {
        redistributed.push({
          id: uid("plan"),
          date,
          subjectId: subject.id,
          subjectName: subject.name,
          topic: block.topic,
          minutes: block.minutes,
          done: false,
        });
      }
    }
  }

  return redistributed.sort((a, b) => a.date.localeCompare(b.date));
}
