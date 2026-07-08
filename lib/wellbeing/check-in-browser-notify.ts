import { loadServerPushEnabled } from "@/lib/wellbeing/server-push-client";
import { loadPwaRemindersEnabled, showPwaCheckInNotification } from "@/lib/wellbeing/pwa-check-in";

const PREFS_KEY = "kampus.wellbeing.browserNotify.v1";
const LAST_FIRED_KEY = "kampus.wellbeing.browserNotify.lastFired.v1";

export function loadBrowserNotifyEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PREFS_KEY) === "1";
}

export function saveBrowserNotifyEnabled(value: boolean): void {
  if (typeof window === "undefined") return;
  if (value) window.localStorage.setItem(PREFS_KEY, "1");
  else window.localStorage.removeItem(PREFS_KEY);
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
): Promise<void> {
  if (!browserNotifySupported()) return;
  if (Notification.permission !== "granted") return;
  if (!loadBrowserNotifyEnabled() && !loadPwaRemindersEnabled() && !loadServerPushEnabled()) return;

  const today = new Date().toISOString().slice(0, 10);
  if (typeof window !== "undefined" && window.localStorage.getItem(LAST_FIRED_KEY) === today) return;

  try {
    if (loadPwaRemindersEnabled()) {
      const sent = await showPwaCheckInNotification(title, body, "/wellbeing/diary");
      if (sent) {
        window.localStorage.setItem(LAST_FIRED_KEY, today);
        return;
      }
    }
    if (loadBrowserNotifyEnabled()) {
      new Notification(title, { body, tag, icon: "/icons/icon-192.svg" });
      window.localStorage.setItem(LAST_FIRED_KEY, today);
    }
  } catch {
    /* ignore — some browsers block without gesture */
  }
}
