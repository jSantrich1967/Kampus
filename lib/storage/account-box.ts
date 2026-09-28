/** Shared label for the smaller browser boxes that still needed a per-account key. */

let ownerId: string | null = null;

export function setAccountBoxOwner(userId: string | null) {
  ownerId = userId;
}

export function accountStorageKey(base: string, userId?: string | null): string {
  const id = userId === undefined ? ownerId : userId;
  return id ? `${base}.${id}` : `${base}.anonymous`;
}

export function readAccountItem(base: string, userId?: string | null): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(accountStorageKey(base, userId));
  } catch {
    return null;
  }
}

export function writeAccountItem(base: string, value: string, userId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(accountStorageKey(base, userId), value);
  } catch {
    /* ignore quota / private mode */
  }
}

export function removeAccountItem(base: string, userId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(accountStorageKey(base, userId));
  } catch {
    /* ignore */
  }
}

export function readAccountFlag(base: string, userId?: string | null): boolean {
  return readAccountItem(base, userId) === "1";
}

export function writeAccountFlag(base: string, value: boolean, userId?: string | null) {
  if (value) writeAccountItem(base, "1", userId);
  else removeAccountItem(base, userId);
}

/** Old shared keys. Never copy them into the next account. */
export const SHARED_ACCOUNT_BOXES = [
  "kampus.vcDemoSessions.v1",
  "kampus.vcDemoEnrolled.v1",
  "kampus.diary.syncMeta.v1",
  "kampus.authBypassBanner.dismissed.v1",
  "kampus.psychologist.disclaimerAccepted.v1",
  "kampus.wellbeing.serverPush.v1",
  "kampus.wellbeing.pwaReminders.v1",
  "kampus.wellbeing.checkInReminderDismissed.v1",
  "kampus.wellbeing.browserNotify.v1",
  "kampus.wellbeing.browserNotify.lastFired.v1",
  "kampus.wellbeing.pwaNotify.lastFired.v1",
  "kampus.collaborate.virtualClassNotify.v1",
  "kampus.collaborate.virtualClassNotifyLast.v1",
  "kampus.collaborate.deadlineNotify.v1",
  "kampus.collaborate.deadlineNotify.lastFired.v1",
  "kampus.collaborate.deadlineServerPush.v1",
] as const;

export function clearSharedAccountBoxes(userId?: string | null) {
  for (const base of SHARED_ACCOUNT_BOXES) removeAccountItem(base, userId);
}

export function discardLegacySharedAccountBoxes() {
  if (typeof window === "undefined") return;
  for (const base of SHARED_ACCOUNT_BOXES) {
    try {
      window.localStorage.removeItem(base);
    } catch {
      /* ignore */
    }
  }
}
