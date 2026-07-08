const STORAGE_KEY = "kampus.community.saved.v1";

export function loadSavedPostIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function saveSavedPostIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function toggleSavedPostId(postId: string): boolean {
  const ids = loadSavedPostIds();
  const has = ids.includes(postId);
  const next = has ? ids.filter((id) => id !== postId) : [postId, ...ids];
  saveSavedPostIds(next.slice(0, 100));
  return !has;
}

export function isPostSaved(postId: string): boolean {
  return loadSavedPostIds().includes(postId);
}
