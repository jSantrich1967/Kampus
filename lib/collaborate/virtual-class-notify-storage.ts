const ENABLED_KEY = "kampus.collaborate.virtualClassNotify.v1";
const LAST_FIRED_KEY = "kampus.collaborate.virtualClassNotifyLast.v1";

export function loadVirtualClassNotifyEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ENABLED_KEY) === "1";
}

export function saveVirtualClassNotifyEnabled(value: boolean): void {
  if (typeof window === "undefined") return;
  if (value) window.localStorage.setItem(ENABLED_KEY, "1");
  else window.localStorage.removeItem(ENABLED_KEY);
}

/** sessionId -> ISO date when last notified (~1h before). */
export function loadVirtualClassNotifyLastFired(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LAST_FIRED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

export function saveVirtualClassNotifyLastFired(map: Record<string, string>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_FIRED_KEY, JSON.stringify(map));
}

export function markVirtualClassNotified(sessionId: string, dateIso: string): void {
  const map = loadVirtualClassNotifyLastFired();
  map[sessionId] = dateIso;
  saveVirtualClassNotifyLastFired(map);
}

export function wasVirtualClassNotified(sessionId: string, dateIso: string): boolean {
  return loadVirtualClassNotifyLastFired()[sessionId] === dateIso;
}
