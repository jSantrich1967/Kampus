import type { PassPlanIntensity } from "@/lib/pass-mode";

/** Old builds used one box for every account. Never read it into a user. */
const LEGACY_KEY = "kampus.passModeIntensity.v1";

let ownerId: string | null = null;

export function setPassModeIntensityOwner(userId: string | null) {
  ownerId = userId;
}

export function passModeIntensityStorageKey(userId: string | null = ownerId): string {
  if (!userId) return "kampus.passModeIntensity.v1.anonymous";
  return `kampus.passModeIntensity.v1.${userId}`;
}

function resolveOwner(userId?: string | null): string | null {
  return userId === undefined ? ownerId : userId;
}

export type PassModeIntensityState = {
  intensity: PassPlanIntensity;
  /** YYYY-MM-DD when preference was last set */
  date: string;
  /** User manually picked intensity (vs auto minimal on overload) */
  userOverride: boolean;
};

function todayDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyState(): PassModeIntensityState {
  return { intensity: "full", date: todayDateKey(), userOverride: false };
}

export function loadPassModeIntensityState(userId?: string | null): PassModeIntensityState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(passModeIntensityStorageKey(resolveOwner(userId)));
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<PassModeIntensityState>;
    const intensity = parsed.intensity === "minimal" || parsed.intensity === "full" ? parsed.intensity : "full";
    if (parsed.date !== todayDateKey()) {
      return { intensity, date: todayDateKey(), userOverride: false };
    }
    return {
      intensity,
      date: todayDateKey(),
      userOverride: Boolean(parsed.userOverride),
    };
  } catch {
    return emptyState();
  }
}

export function loadPassModeIntensity(userId?: string | null): PassPlanIntensity {
  return loadPassModeIntensityState(userId).intensity;
}

export function savePassModeIntensity(
  intensity: PassPlanIntensity,
  userOverride = true,
  userId?: string | null,
) {
  writePassModeIntensityState(intensity, userOverride, userId);
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("kampus-pass-intensity-change", { detail: intensity }));
}

function writePassModeIntensityState(
  intensity: PassPlanIntensity,
  userOverride: boolean,
  userId?: string | null,
) {
  if (typeof window === "undefined") return;
  const state: PassModeIntensityState = {
    intensity,
    date: todayDateKey(),
    userOverride,
  };
  window.localStorage.setItem(passModeIntensityStorageKey(resolveOwner(userId)), JSON.stringify(state));
}

/** Persist without broadcasting — avoids setState on siblings still mounting. */
export function savePassModeIntensitySilent(
  intensity: PassPlanIntensity,
  userOverride = false,
  userId?: string | null,
) {
  writePassModeIntensityState(intensity, userOverride, userId);
}

export function saveAutoMinimalIntensity(userId?: string | null) {
  savePassModeIntensitySilent("minimal", false, userId);
}

export function clearPassModeIntensity(userId?: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(passModeIntensityStorageKey(resolveOwner(userId)));
}

export function discardLegacyPassModeIntensity() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_KEY);
}
