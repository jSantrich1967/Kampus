import { readAccountFlag, readAccountItem, writeAccountFlag, writeAccountItem } from "@/lib/storage/account-box";

const PREFS_BASE = "kampus.collaborate.deadlineNotify.v1";
const LAST_FIRED_BASE = "kampus.collaborate.deadlineNotify.lastFired.v1";

export function loadCollaborateDeadlineNotifyEnabled(userId?: string | null): boolean {
  return readAccountFlag(PREFS_BASE, userId);
}

export function saveCollaborateDeadlineNotifyEnabled(value: boolean, userId?: string | null): void {
  writeAccountFlag(PREFS_BASE, value, userId);
}

export function loadCollaborateDeadlineNotifyLastFiredDate(userId?: string | null): string | null {
  return readAccountItem(LAST_FIRED_BASE, userId);
}

export function saveCollaborateDeadlineNotifyLastFiredDate(isoDate: string, userId?: string | null): void {
  writeAccountItem(LAST_FIRED_BASE, isoDate, userId);
}
