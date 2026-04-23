import { defaultProfile, profileSchema, type UserProfile } from "@/lib/schemas/profile";

const STORAGE_KEY = "kampus.profile.v1";

export function loadProfile(): UserProfile {
  if (typeof window === "undefined") return defaultProfile;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile;
    const json: unknown = JSON.parse(raw);
    if (!json || typeof json !== "object") return defaultProfile;
    const parsed = profileSchema.safeParse({ ...defaultProfile, ...(json as object) });
    return parsed.success ? parsed.data : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

export function saveProfile(profile: UserProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}
