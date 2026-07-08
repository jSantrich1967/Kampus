"use client";

import { AlertTriangle, Bell, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { useDiaryInsights } from "@/hooks/use-diary-insights";
import { useCounselorProactiveAlert } from "@/hooks/use-counselor-proactive-alert";
import { useWellbeingRiskSignal } from "@/hooks/use-wellbeing-risk-signal";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isProactiveAlertLevel } from "@/lib/wellbeing/counselor-alert-eligibility";
import {
  loadCounselorAutoAlertEnabled,
  saveCounselorAutoAlertEnabled,
} from "@/lib/wellbeing/counselor-alert-storage";
import { institutionKeyFromUniversity } from "@/lib/wellbeing/institution-pulse-build";
import { currentWeekStartIso } from "@/lib/wellbeing/institution-pulse-storage";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

export function WellbeingCounselorAlertPanel() {
  const t = wellbeingCopy.es;
  const { profile, authUserId } = useKampus();
  const { signal, loading: riskLoading } = useWellbeingRiskSignal();
  const { insights } = useDiaryInsights();
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useCounselorProactiveAlert();

  const institutionKey = institutionKeyFromUniversity(profile.university);
  const canAlert = Boolean(isSupabaseConfigured() && authUserId && institutionKey);
  const showManual = isProactiveAlertLevel(signal.level) && insights.entriesLast14Days > 0;

  useEffect(() => {
    setHydrated(true);
    setAutoEnabled(loadCounselorAutoAlertEnabled());
  }, []);

  const sendManual = useCallback(async () => {
    if (!canAlert || !institutionKey) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/wellbeing/counselor/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionKey,
          weekStart: currentWeekStartIso(),
          riskLevel: signal.level as "watch" | "elevated",
          riskScore: signal.score,
          reasons: signal.reasons,
          channel: "manual",
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; duplicate?: boolean };
      if (!res.ok) {
        setMessage(json.error ?? t.counselorAlertError);
        return;
      }
      setMessage(json.duplicate ? t.counselorAlertDuplicate : t.counselorAlertManualOk);
    } catch {
      setMessage(t.counselorAlertError);
    } finally {
      setBusy(false);
    }
  }, [canAlert, institutionKey, signal, t.counselorAlertDuplicate, t.counselorAlertError, t.counselorAlertManualOk]);

  function toggleAuto() {
    const next = !autoEnabled;
    saveCounselorAutoAlertEnabled(next);
    setAutoEnabled(next);
    setMessage(next ? t.counselorAlertAutoOn : t.counselorAlertAutoOff);
  }

  if (!hydrated || riskLoading) return null;

  return (
    <Card className="border-rose-400/20 bg-gradient-to-br from-rose-500/10 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-rose-300" aria-hidden />
          {t.counselorAlertTitle}
        </CardTitle>
        <CardDescription>{t.counselorAlertHint}</CardDescription>
      </CardHeader>
      <div className="space-y-3 px-6 pb-5">
        {showManual ? (
          <p className="flex items-start gap-2 text-sm text-rose-100/90">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
            {t.counselorAlertActiveSignal(signal.level, signal.score)}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={autoEnabled ? "secondary" : "primary"} onClick={toggleAuto}>
            {autoEnabled ? t.counselorAlertAutoOff : t.counselorAlertAutoOn}
          </Button>
          {showManual ? (
            <Button type="button" size="sm" variant="secondary" disabled={busy || !canAlert} onClick={() => void sendManual()}>
              {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
              {t.counselorAlertManualCta}
            </Button>
          ) : null}
        </div>
        {message ? <p className="text-sm text-slate-300">{message}</p> : null}
        {!canAlert ? <p className="text-xs text-slate-500">{t.counselorAlertLoginRequired}</p> : null}
        <p className="text-[11px] text-slate-500">{t.counselorAlertPrivacy}</p>
      </div>
    </Card>
  );
}
