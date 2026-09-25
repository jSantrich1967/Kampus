import { daysUntilCalendarDate } from "@/lib/calendar/local-iso-date";

/** Days from today until an ISO date (local calendar day, not UTC midnight). */
export function daysUntilDate(isoDate: string, now: Date = new Date()): number | null {
  if (!isoDate.trim()) return null;
  return daysUntilCalendarDate(isoDate, now);
}

export function urgencyTone(days: number | null): "danger" | "warning" | "neutral" | "success" {
  if (days === null) return "neutral";
  if (days < 0) return "neutral";
  if (days <= 3) return "danger";
  if (days <= 7) return "warning";
  if (days <= 14) return "success";
  return "neutral";
}

export function daysLeftLabel(days: number): string {
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `${days} días`;
}
