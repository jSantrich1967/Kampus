/** Decks with due date within this window count toward sidebar badge. */
export function daysUntilDueIso(dueIso: string, now = new Date()): number | null {
  const d = dueIso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const [y, m, day] = d.split("-").map(Number);
  const due = new Date(y!, m! - 1, day!);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function isPresentationDueSoon(dueIso: string | undefined, now = new Date()): boolean {
  const d = dueIso?.trim();
  if (!d) return false;
  const days = daysUntilDueIso(d, now);
  if (days === null) return false;
  return days <= 14 && days >= -7;
}

export const PRESENTATIONS_CHANGED_EVENT = "kampus:presentations-changed";

export function notifyPresentationsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PRESENTATIONS_CHANGED_EVENT));
}
