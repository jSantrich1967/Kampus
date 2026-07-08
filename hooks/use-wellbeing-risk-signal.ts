"use client";

import { useMemo } from "react";

import { useDiaryInsights } from "@/hooks/use-diary-insights";
import { computeWellbeingRiskSignal, type WellbeingRiskSignal } from "@/lib/wellbeing/wellbeing-risk-bridge";

export function useWellbeingRiskSignal(): {
  signal: WellbeingRiskSignal;
  loading: boolean;
} {
  const { insights, loading } = useDiaryInsights();

  const signal = useMemo(() => computeWellbeingRiskSignal(insights), [insights]);

  return { signal, loading };
}
