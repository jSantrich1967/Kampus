import { localIsoDate } from "@/lib/calendar/local-iso-date";

const DISMISS_KEY = "kampus.wellbeing.checkInReminderDismissed.v1";

/** Evening reminder hour (local time, 24h). */
export const CHECK_IN_REMINDER_HOUR = 18;

export function isCheckInReminderDismissedToday(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    return raw === localIsoDate();
  } catch {
    return false;
  }
}

export function dismissCheckInReminderForToday(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISMISS_KEY, localIsoDate());
}

export function shouldShowCheckInReminder(hasCheckedInToday: boolean, now = new Date()): boolean {
  if (hasCheckedInToday) return false;
  if (isCheckInReminderDismissedToday()) return false;
  return now.getHours() >= CHECK_IN_REMINDER_HOUR;
}
