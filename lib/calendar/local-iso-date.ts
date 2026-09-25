/**
 * Calendar YYYY-MM-DD in the user's **local** timezone.
 * Avoid `toISOString().slice(0, 10)` — that is UTC and shifts the calendar day
 * for most users (e.g. an exam appears on the wrong date cell).
 */
export function localIsoDate(d: Date = new Date()): string {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * A date-only string (`2026-09-30`) is that calendar day in the student's timezone.
 * `new Date("2026-09-30")` is UTC midnight, which is still the 29th in Caracas.
 */
export function calendarDateFromIso(isoDate: string): Date | null {
  const trimmed = isoDate.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  }
  const instant = new Date(trimmed);
  if (Number.isNaN(instant.getTime())) return null;
  instant.setHours(0, 0, 0, 0);
  return instant;
}

/** Whole calendar days from `now` until `isoDate`. Negative if the date already passed. */
export function daysUntilCalendarDate(isoDate: string, now: Date = new Date()): number | null {
  const target = calendarDateFromIso(isoDate);
  if (!target) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function addDaysLocalIso(days: number, from: Date = new Date()): string {
  const x = new Date(from);
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() + days);
  return localIsoDate(x);
}

/**
 * Two demo due dates in the **same calendar month** when there is enough room;
 * otherwise spaced by calendar days (local) so events still show up.
 */
export function demoExamDueDatesSameMonth(): { due1: string; due2: string } {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const y = today.getFullYear();
  const m0 = today.getMonth();
  const last = new Date(y, m0 + 1, 0).getDate();
  const d = today.getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ms = pad(m0 + 1);

  if (d >= last - 1) {
    return { due1: addDaysLocalIso(5, today), due2: addDaysLocalIso(12, today) };
  }

  const first = Math.min(d + 3, last);
  const second = Math.min(first + 5, last);
  if (second > first) {
    return { due1: `${y}-${ms}-${pad(first)}`, due2: `${y}-${ms}-${pad(second)}` };
  }
  return { due1: addDaysLocalIso(5, today), due2: addDaysLocalIso(12, today) };
}
