import { readAccountFlag, readAccountItem, writeAccountFlag, writeAccountItem } from "@/lib/storage/account-box";

const ENABLED_BASE = "kampus.collaborate.virtualClassNotify.v1";
const LAST_FIRED_BASE = "kampus.collaborate.virtualClassNotifyLast.v1";

export function loadVirtualClassNotifyEnabled(userId?: string | null): boolean {
  return readAccountFlag(ENABLED_BASE, userId);
}

export function saveVirtualClassNotifyEnabled(value: boolean, userId?: string | null): void {
  writeAccountFlag(ENABLED_BASE, value, userId);
}

/** sessionId -> ISO date when last notified (~1h before). */
export function loadVirtualClassNotifyLastFired(userId?: string | null): Record<string, string> {
  const raw = readAccountItem(LAST_FIRED_BASE, userId);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

export function saveVirtualClassNotifyLastFired(map: Record<string, string>, userId?: string | null): void {
  writeAccountItem(LAST_FIRED_BASE, JSON.stringify(map), userId);
}

export function markVirtualClassNotified(sessionId: string, dateIso: string, userId?: string | null): void {
  const map = loadVirtualClassNotifyLastFired(userId);
  map[sessionId] = dateIso;
  saveVirtualClassNotifyLastFired(map, userId);
}

export function wasVirtualClassNotified(sessionId: string, dateIso: string, userId?: string | null): boolean {
  return loadVirtualClassNotifyLastFired(userId)[sessionId] === dateIso;
}
