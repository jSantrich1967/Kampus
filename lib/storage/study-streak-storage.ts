import { addDaysLocalIso, localIsoDate } from "@/lib/calendar/local-iso-date";

const STORAGE_KEY = "kampus.studyStreak.v1";

export type StudyStreakState = {
  /** YYYY-MM-DD dates when the student completed at least one mission block */
  activeDates: string[];
};

function emptyState(): StudyStreakState {
  return { activeDates: [] };
}

function dateFromLocalIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  const x = new Date(y!, m! - 1, d!);
  x.setHours(12, 0, 0, 0);
  return x;
}

export function loadStudyStreakState(): StudyStreakState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as StudyStreakState;
    const dates = Array.isArray(parsed.activeDates)
      ? [...new Set(parsed.activeDates.filter((d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)))]
      : [];
    dates.sort();
    return { activeDates: dates };
  } catch {
    return emptyState();
  }
}

function saveStudyStreakState(state: StudyStreakState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Marks today (or given date) as an active study day. Idempotent. */
export function recordStudyActivity(date: string = localIsoDate()): StudyStreakState {
  const current = loadStudyStreakState();
  const set = new Set(current.activeDates);
  set.add(date);
  const next = { activeDates: [...set].sort() };
  saveStudyStreakState(next);
  return next;
}

/**
 * Streak of consecutive active days ending today (or yesterday with one grace day).
 * Same pattern as diary streak — you can keep the chain if you study today or studied yesterday.
 */
export function computeStudyStreakDays(activeDates: string[], today: string = localIsoDate()): number {
  if (activeDates.length === 0) return 0;
  const set = new Set(activeDates);
  let d = dateFromLocalIso(today);

  if (!set.has(today)) {
    d.setDate(d.getDate() - 1);
    if (!set.has(localIsoDate(d))) return 0;
  } else {
    d = dateFromLocalIso(today);
  }

  let streak = 0;
  for (let guard = 0; guard < 400; guard += 1) {
    const iso = localIsoDate(d);
    if (!set.has(iso)) break;
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function getStudyStreakDays(): number {
  return computeStudyStreakDays(loadStudyStreakState().activeDates);
}

/** Last 7 calendar days ending today — true if student studied that day. */
export function last7DayActivity(activeDates: string[], today: string = localIsoDate()): boolean[] {
  const set = new Set(activeDates);
  const out: boolean[] = [];
  for (let offset = -6; offset <= 0; offset += 1) {
    out.push(set.has(addDaysLocalIso(offset, dateFromLocalIso(today))));
  }
  return out;
}

export function studiedOnDate(iso: string): boolean {
  return loadStudyStreakState().activeDates.includes(iso);
}
