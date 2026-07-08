import type { PassPlanIntensity } from "@/lib/pass-mode";

const STORAGE_KEY = "kampus.passModeIntensity.v1";

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

export function loadPassModeIntensityState(): PassModeIntensityState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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

export function loadPassModeIntensity(): PassPlanIntensity {
  return loadPassModeIntensityState().intensity;
}

export function savePassModeIntensity(intensity: PassPlanIntensity, userOverride = true) {
  writePassModeIntensityState(intensity, userOverride);
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("kampus-pass-intensity-change", { detail: intensity }));
}

function writePassModeIntensityState(intensity: PassPlanIntensity, userOverride: boolean) {
  if (typeof window === "undefined") return;
  const state: PassModeIntensityState = {
    intensity,
    date: todayDateKey(),
    userOverride,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Persist without broadcasting — avoids setState on siblings still mounting. */
export function savePassModeIntensitySilent(intensity: PassPlanIntensity, userOverride = false) {
  writePassModeIntensityState(intensity, userOverride);
}

export function saveAutoMinimalIntensity() {
  savePassModeIntensitySilent("minimal", false);
}
