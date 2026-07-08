/** Monday of the week containing `date` (local midnight). */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

export function isoFromLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export type WeekDayCell = {
  iso: string;
  dayNum: number;
  isToday: boolean;
  weekdayLabel: string;
};

export function buildWeekDayCells(weekStartMonday: Date, todayIso: string, weekdayLabels: string[]): WeekDayCell[] {
  return weekdayLabels.map((weekdayLabel, i) => {
    const d = addDays(weekStartMonday, i);
    const iso = isoFromLocalDate(d);
    return {
      iso,
      dayNum: d.getDate(),
      isToday: iso === todayIso,
      weekdayLabel,
    };
  });
}

export function formatWeekRangeLabel(weekStartMonday: Date, locale = "es-ES"): string {
  const end = addDays(weekStartMonday, 6);
  const sameMonth = weekStartMonday.getMonth() === end.getMonth();
  const startStr = weekStartMonday.toLocaleDateString(locale, { day: "numeric", month: "short" });
  const endStr = end.toLocaleDateString(locale, {
    day: "numeric",
    month: sameMonth ? undefined : "short",
    year: weekStartMonday.getFullYear() !== end.getFullYear() ? "numeric" : undefined,
  });
  const year =
    weekStartMonday.getFullYear() === end.getFullYear()
      ? ` ${weekStartMonday.getFullYear()}`
      : ` ${weekStartMonday.getFullYear()}–${end.getFullYear()}`;
  return `${startStr} – ${endStr}${year}`;
}
