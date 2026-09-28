/** Old builds used one switch for every account on this computer. Never copy it into a user. */
const LEGACY_ENABLED_KEY = "kampus.wellbeing.counselorAutoAlert.v1";
const LEGACY_WEEK_KEY = "kampus.wellbeing.counselorAutoAlert.lastWeek.v1";

let ownerId: string | null = null;

export function setCounselorAlertOwner(userId: string | null) {
  ownerId = userId;
}

function resolveOwner(userId?: string | null): string | null {
  return userId === undefined ? ownerId : userId;
}

function enabledKey(userId: string | null): string {
  return userId
    ? `kampus.wellbeing.counselorAutoAlert.v1.${userId}`
    : "kampus.wellbeing.counselorAutoAlert.v1.anonymous";
}

function weekKey(userId: string | null): string {
  return userId
    ? `kampus.wellbeing.counselorAutoAlert.lastWeek.v1.${userId}`
    : "kampus.wellbeing.counselorAutoAlert.lastWeek.v1.anonymous";
}

export function loadCounselorAutoAlertEnabled(userId?: string | null): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(enabledKey(resolveOwner(userId))) === "1";
}

export function saveCounselorAutoAlertEnabled(value: boolean, userId?: string | null): void {
  if (typeof window === "undefined") return;
  const key = enabledKey(resolveOwner(userId));
  if (value) window.localStorage.setItem(key, "1");
  else window.localStorage.removeItem(key);
}

export function loadLastAutoAlertWeek(userId?: string | null): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(weekKey(resolveOwner(userId)));
}

export function saveLastAutoAlertWeek(weekStart: string, userId?: string | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(weekKey(resolveOwner(userId)), weekStart);
}

export function clearCounselorAlertStorage(userId: string | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(enabledKey(userId));
  window.localStorage.removeItem(weekKey(userId));
}

export function discardLegacyCounselorAlert(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_ENABLED_KEY);
  window.localStorage.removeItem(LEGACY_WEEK_KEY);
}
