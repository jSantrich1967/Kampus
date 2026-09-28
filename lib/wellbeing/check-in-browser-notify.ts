import { readAccountFlag, readAccountItem, writeAccountFlag, writeAccountItem } from "@/lib/storage/account-box";
import { loadServerPushEnabled } from "@/lib/wellbeing/server-push-client";
import { loadPwaRemindersEnabled, showPwaCheckInNotification } from "@/lib/wellbeing/pwa-check-in";

const PREFS_BASE = "kampus.wellbeing.browserNotify.v1";
const LAST_FIRED_BASE = "kampus.wellbeing.browserNotify.lastFired.v1";

export function loadBrowserNotifyEnabled(userId?: string | null): boolean {
  return readAccountFlag(PREFS_BASE, userId);
}

export function saveBrowserNotifyEnabled(value: boolean, userId?: string | null): void {
  writeAccountFlag(PREFS_BASE, value, userId);
}

export function browserNotifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestBrowserNotifyPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!browserNotifySupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return await Notification.requestPermission();
}

export async function fireCheckInBrowserNotification(
  title: string,
  body: string,
  tag = "kampus-check-in",
  userId?: string | null,
): Promise<void> {
  if (!browserNotifySupported()) return;
  if (Notification.permission !== "granted") return;
  if (!loadBrowserNotifyEnabled(userId) && !loadPwaRemindersEnabled(userId) && !loadServerPushEnabled(userId)) return;

  const today = new Date().toISOString().slice(0, 10);
  if (readAccountItem(LAST_FIRED_BASE, userId) === today) return;

  try {
    if (loadPwaRemindersEnabled(userId)) {
      const sent = await showPwaCheckInNotification(title, body, "/wellbeing/diary", userId);
      if (sent) {
        writeAccountItem(LAST_FIRED_BASE, today, userId);
        return;
      }
    }
    if (loadBrowserNotifyEnabled(userId)) {
      new Notification(title, { body, tag, icon: "/icons/icon-192.svg" });
      writeAccountItem(LAST_FIRED_BASE, today, userId);
    }
  } catch {
    /* ignore — some browsers block without gesture */
  }
}
