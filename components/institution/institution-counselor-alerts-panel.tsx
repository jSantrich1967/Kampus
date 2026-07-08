"use client";

import { BellRing } from "lucide-react";
import { useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatBlock } from "@/components/ui/stat-block";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  fetchInstitutionCounselorAlertsSummary,
  type InstitutionCounselorAlertsSummary,
} from "@/lib/supabase/wellbeing-counselor-alerts-db";
import { institutionKeyFromUniversity } from "@/lib/wellbeing/institution-pulse-build";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

export function InstitutionCounselorAlertsPanel() {
  const t = wellbeingCopy.es;
  const { profile, authUserId } = useKampus();
  const [summary, setSummary] = useState<InstitutionCounselorAlertsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const institutionKey = institutionKeyFromUniversity(profile.university);

  useEffect(() => {
    if (!authUserId || !isSupabaseConfigured() || !institutionKey) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const data = await fetchInstitutionCounselorAlertsSummary(supabase, institutionKey);
        if (!cancelled) setSummary(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t.counselorAlertInstitutionError);
          setSummary(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId, institutionKey, t.counselorAlertInstitutionError]);

  if (!institutionKey) return null;

  return (
    <Card className="border-rose-400/25 bg-rose-950/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BellRing className="h-5 w-5 text-rose-300" aria-hidden />
          {t.counselorAlertInstitutionTitle}
        </CardTitle>
        <CardDescription>{t.counselorAlertInstitutionHint}</CardDescription>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6">
        {loading ? <p className="text-sm text-slate-400">{t.counselorAlertInstitutionLoading}</p> : null}
        {error ? <p className="text-sm text-rose-200">{error}</p> : null}
        {!loading && summary && summary.alerts14d > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatBlock label={t.counselorAlertInstitutionTotal} value={summary.alerts14d} hint={t.counselorAlertInstitutionTotalHint} />
            <StatBlock label={t.riskLevelWatch} value={summary.watchCount} hint={t.counselorAlertInstitutionWatchHint} />
            <StatBlock label={t.riskLevelElevated} value={summary.elevatedCount} hint={t.counselorAlertInstitutionElevatedHint} />
            <StatBlock
              label={t.counselorAlertInstitutionAuto}
              value={summary.autoCount}
              hint={t.counselorAlertInstitutionAutoHint(summary.manualCount)}
            />
          </div>
        ) : null}
        {!loading && !error && (!summary || summary.alerts14d === 0) ? (
          <p className="text-sm text-slate-400">{t.counselorAlertInstitutionEmpty}</p>
        ) : null}
      </div>
    </Card>
  );
}
