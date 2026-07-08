/** Hours until session start (negative if already started). */
export function hoursUntilSession(startsAtIso: string, now = new Date()): number {
  const start = new Date(startsAtIso);
  if (Number.isNaN(start.getTime())) return Infinity;
  return (start.getTime() - now.getTime()) / (3600 * 1000);
}

/** Session starts within the next N hours (and has not ended more than 1h ago). */
export function isVirtualSessionSoon(startsAtIso: string, windowHours = 24, now = new Date()): boolean {
  const h = hoursUntilSession(startsAtIso, now);
  return h >= -1 && h <= windowHours;
}

export const VIRTUAL_SESSIONS_CHANGED_EVENT = "kampus:virtual-sessions-changed";

export function notifyVirtualSessionsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(VIRTUAL_SESSIONS_CHANGED_EVENT));
}
