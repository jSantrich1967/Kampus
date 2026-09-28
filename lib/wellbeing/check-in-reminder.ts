import { localIsoDate } from "@/lib/calendar/local-iso-date";
import { readAccountItem, writeAccountItem } from "@/lib/storage/account-box";

const DISMISS_BASE = "kampus.wellbeing.checkInReminderDismissed.v1";

/** Evening reminder hour (local time, 24h). */
export const CHECK_IN_REMINDER_HOUR = 18;

export function isCheckInReminderDismissedToday(userId?: string | null): boolean {
  return readAccountItem(DISMISS_BASE, userId) === localIsoDate();
}

export function dismissCheckInReminderForToday(userId?: string | null): void {
  writeAccountItem(DISMISS_BASE, localIsoDate(), userId);
}

export function shouldShowCheckInReminder(
  hasCheckedInToday: boolean,
  now = new Date(),
  userId?: string | null,
): boolean {
  if (hasCheckedInToday) return false;
  if (isCheckInReminderDismissedToday(userId)) return false;
  return now.getHours() >= CHECK_IN_REMINDER_HOUR;
}
