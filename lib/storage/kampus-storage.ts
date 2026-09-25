import { defaultProfile, profileSchema, type UserProfile } from "@/lib/schemas/profile";

/** Old builds used one box for every account. Never read it into a user. */
const LEGACY_KEY = "kampus.profile.v1";

let ownerId: string | null = null;

export function setProfileStorageOwner(userId: string | null) {
  ownerId = userId;
}

export function profileStorageKey(userId: string | null = ownerId): string {
  if (!userId) return "kampus.profile.v1.anonymous";
  return `kampus.profile.v1.${userId}`;
}

function resolveOwner(userId?: string | null): string | null {
  return userId === undefined ? ownerId : userId;
}

function readProfile(raw: string | null): UserProfile {
  if (!raw) return defaultProfile;
  try {
    const json: unknown = JSON.parse(raw);
    if (!json || typeof json !== "object") return defaultProfile;
    const parsed = profileSchema.safeParse({ ...defaultProfile, ...(json as object) });
    return parsed.success ? parsed.data : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

export function loadProfile(userId?: string | null): UserProfile {
  if (typeof window === "undefined") return defaultProfile;
  const raw = window.localStorage.getItem(profileStorageKey(resolveOwner(userId)));
  return readProfile(raw);
}

export function saveProfile(profile: UserProfile, userId?: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(profileStorageKey(resolveOwner(userId)), JSON.stringify(profile));
}

export function clearProfileStorage(userId: string | null = ownerId) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(profileStorageKey(userId));
}

export function discardLegacyProfileStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_KEY);
}
