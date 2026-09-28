import { readAccountFlag, writeAccountFlag } from "@/lib/storage/account-box";

const PWA_PREFS_BASE = "kampus.wellbeing.pwaReminders.v1";
const SW_URL = "/sw.js";

export function loadPwaRemindersEnabled(userId?: string | null): boolean {
  return readAccountFlag(PWA_PREFS_BASE, userId);
}

export function savePwaRemindersEnabled(value: boolean, userId?: string | null): void {
  writeAccountFlag(PWA_PREFS_BASE, value, userId);
}

export function pwaSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator;
}

export async function registerWellbeingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pwaSupported()) return null;
  try {
    return await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  } catch {
    return null;
  }
}

export async function showPwaCheckInNotification(
  title: string,
  body: string,
  url = "/wellbeing/diary",
  userId?: string | null,
): Promise<boolean> {
  if (!pwaSupported() || !loadPwaRemindersEnabled(userId)) return false;
  if (Notification.permission !== "granted") return false;

  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg?.active) return false;

  reg.active.postMessage({ type: "SHOW_CHECK_IN", title, body, url });
  return true;
}

/** Milliseconds until next local 18:00 (or 0 if already passed today). */
export function msUntilNextCheckInHour(hour = 18): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
