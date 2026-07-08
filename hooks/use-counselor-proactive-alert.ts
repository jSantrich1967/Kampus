"use client";

import { useEffect, useRef } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { useDiaryInsights } from "@/hooks/use-diary-insights";
import { useWellbeingRiskSignal } from "@/hooks/use-wellbeing-risk-signal";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { shouldSendProactiveCounselorAlert } from "@/lib/wellbeing/counselor-alert-eligibility";
import {
  loadCounselorAutoAlertEnabled,
  loadLastAutoAlertWeek,
  saveLastAutoAlertWeek,
} from "@/lib/wellbeing/counselor-alert-storage";
import { institutionKeyFromUniversity } from "@/lib/wellbeing/institution-pulse-build";
import { currentWeekStartIso } from "@/lib/wellbeing/institution-pulse-storage";

/** Sends at most one auto counselor alert per week when enabled and signal is watch/elevated. */
export function useCounselorProactiveAlert() {
  const { profile, authUserId } = useKampus();
  const { signal } = useWellbeingRiskSignal();
  const { insights } = useDiaryInsights();
  const inflight = useRef(false);

  useEffect(() => {
    if (!loadCounselorAutoAlertEnabled()) return;
    if (!authUserId || !isSupabaseConfigured()) return;
    if (insights.entriesLast14Days === 0) return;

    const institutionKey = institutionKeyFromUniversity(profile.university);
    if (!institutionKey) return;

    const weekStart = currentWeekStartIso();
    const lastWeek = loadLastAutoAlertWeek();
    if (!shouldSendProactiveCounselorAlert(signal, weekStart, lastWeek)) return;
    if (inflight.current) return;

    inflight.current = true;
    void fetch("/api/wellbeing/counselor/alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institutionKey,
        weekStart,
        riskLevel: signal.level as "watch" | "elevated",
        riskScore: signal.score,
        reasons: signal.reasons,
        channel: "auto",
      }),
    })
      .then((res) => {
        if (res.ok) saveLastAutoAlertWeek(weekStart);
      })
      .finally(() => {
        inflight.current = false;
      });
  }, [authUserId, profile.university, signal, insights.entriesLast14Days]);
}
