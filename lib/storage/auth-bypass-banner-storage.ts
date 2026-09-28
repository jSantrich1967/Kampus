import { readAccountFlag, removeAccountItem, writeAccountFlag } from "@/lib/storage/account-box";

const STORAGE_BASE = "kampus.authBypassBanner.dismissed.v1";

export function loadAuthBypassBannerDismissed(userId?: string | null): boolean {
  return readAccountFlag(STORAGE_BASE, userId);
}

export function saveAuthBypassBannerDismissed(userId?: string | null) {
  writeAccountFlag(STORAGE_BASE, true, userId);
}

export function clearAuthBypassBannerDismissed(userId?: string | null) {
  removeAccountItem(STORAGE_BASE, userId);
}
