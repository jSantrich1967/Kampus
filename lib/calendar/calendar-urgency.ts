/** Days from today until an ISO date (local midnight). */
export function daysUntilDate(isoDate: string): number | null {
  if (!isoDate.trim()) return null;
  const target = new Date(isoDate);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
