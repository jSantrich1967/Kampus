const PREFS_KEY = "kampus.collaborate.deadlineNotify.v1";
const LAST_FIRED_KEY = "kampus.collaborate.deadlineNotify.lastFired.v1";

export function loadCollaborateDeadlineNotifyEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PREFS_KEY) === "1";
}

export function saveCollaborateDeadlineNotifyEnabled(value: boolean): void {
  if (typeof window === "undefined") return;
  if (value) window.localStorage.setItem(PREFS_KEY, "1");
  else window.localStorage.removeItem(PREFS_KEY);
}

export function loadCollaborateDeadlineNotifyLastFiredDate(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_FIRED_KEY);
}

export function saveCollaborateDeadlineNotifyLastFiredDate(isoDate: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_FIRED_KEY, isoDate);
}
