"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { buildPassModePlan, type PassPlanIntensity } from "@/lib/pass-mode";
import { isPlanOverloaded } from "@/lib/pass-mode/plan-overload";
import {
  loadPassModeIntensityState,
  saveAutoMinimalIntensity,
  savePassModeIntensity,
} from "@/lib/storage/pass-mode-intensity-storage";

/** Ensures auto-minimal runs once per page load across multiple hook instances. */
let autoMinimalBootstrapped = false;

function readIntensityState(profile: ReturnType<typeof useKampus>["profile"]) {
  const stored = loadPassModeIntensityState();
  const overloaded = isPlanOverloaded(profile);

  if (overloaded && !stored.userOverride && stored.intensity === "full") {
    if (!autoMinimalBootstrapped) {
      autoMinimalBootstrapped = true;
      saveAutoMinimalIntensity();
    }
    return {
      intensity: "minimal" as PassPlanIntensity,
      userOverride: false,
      autoMinimalApplied: true,
    };
  }

  return {
    intensity: stored.intensity,
    userOverride: stored.userOverride,
    autoMinimalApplied: overloaded && stored.intensity === "minimal" && !stored.userOverride,
  };
}

export function usePassModePlan() {
  const { profile } = useKampus();
  const [intensity, setIntensityState] = useState<PassPlanIntensity>("full");
  const [userOverride, setUserOverride] = useState(false);
  const [autoMinimalApplied, setAutoMinimalApplied] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const next = readIntensityState(profile);
    setIntensityState(next.intensity);
    setUserOverride(next.userOverride);
    setAutoMinimalApplied(next.autoMinimalApplied);
    setHydrated(true);
  }, [profile]);

  useEffect(() => {
    const syncFromStorage = () => {
      const stored = loadPassModeIntensityState();
      setIntensityState(stored.intensity);
      setUserOverride(stored.userOverride);
      setAutoMinimalApplied(
        isPlanOverloaded(profile) && stored.intensity === "minimal" && !stored.userOverride,
      );
    };

    window.addEventListener("kampus-pass-intensity-change", syncFromStorage);
    window.addEventListener("focus", syncFromStorage);
    return () => {
      window.removeEventListener("kampus-pass-intensity-change", syncFromStorage);
      window.removeEventListener("focus", syncFromStorage);
    };
  }, [profile]);

  const plan = useMemo(
    () => buildPassModePlan(profile, { intensity: hydrated ? intensity : "full" }),
    [profile, intensity, hydrated],
  );

  const overloaded = useMemo(() => isPlanOverloaded(profile), [profile]);

  const setIntensity = useCallback((next: PassPlanIntensity) => {
    savePassModeIntensity(next, true);
    setIntensityState(next);
    setUserOverride(true);
    setAutoMinimalApplied(false);
  }, []);

  return {
    plan,
    intensity,
    setIntensity,
    hydrated,
    overloaded,
    autoMinimalApplied,
    userOverride,
  };
}
