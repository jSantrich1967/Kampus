const AUTO_ALERT_KEY = "kampus.wellbeing.counselorAutoAlert.v1";
const LAST_AUTO_WEEK_KEY = "kampus.wellbeing.counselorAutoAlert.lastWeek.v1";

export function loadCounselorAutoAlertEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTO_ALERT_KEY) === "1";
}

export function saveCounselorAutoAlertEnabled(value: boolean): void {
  if (typeof window === "undefined") return;
  if (value) window.localStorage.setItem(AUTO_ALERT_KEY, "1");
  else window.localStorage.removeItem(AUTO_ALERT_KEY);
}

export function loadLastAutoAlertWeek(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_AUTO_WEEK_KEY);
}

export function saveLastAutoAlertWeek(weekStart: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_AUTO_WEEK_KEY, weekStart);
}
