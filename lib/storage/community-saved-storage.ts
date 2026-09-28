/** Old builds used one box for every account. Never read it into a user. */
const LEGACY_KEY = "kampus.community.saved.v1";

let ownerId: string | null = null;

export function setCommunitySavedOwner(userId: string | null) {
  ownerId = userId;
}

export function communitySavedStorageKey(userId: string | null = ownerId): string {
  if (!userId) return "kampus.community.saved.v1.anonymous";
  return `kampus.community.saved.v1.${userId}`;
}

function resolveOwner(userId?: string | null): string | null {
  return userId === undefined ? ownerId : userId;
}

export function loadSavedPostIds(userId?: string | null): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(communitySavedStorageKey(resolveOwner(userId)));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function saveSavedPostIds(ids: string[], userId?: string | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(communitySavedStorageKey(resolveOwner(userId)), JSON.stringify(ids));
}

export function toggleSavedPostId(postId: string, userId?: string | null): boolean {
  const ids = loadSavedPostIds(userId);
  const has = ids.includes(postId);
  const next = has ? ids.filter((id) => id !== postId) : [postId, ...ids];
  saveSavedPostIds(next.slice(0, 100), userId);
  return !has;
}

export function isPostSaved(postId: string, userId?: string | null): boolean {
  return loadSavedPostIds(userId).includes(postId);
}

export function clearCommunitySaved(userId?: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(communitySavedStorageKey(resolveOwner(userId)));
}

export function discardLegacyCommunitySaved() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_KEY);
}
