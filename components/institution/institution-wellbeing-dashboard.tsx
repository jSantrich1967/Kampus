"use client";

import { BarChart3, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatBlock } from "@/components/ui/stat-block";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  fetchInstitutionWellbeingPulseTrends,
  fetchInstitutionWellbeingRiskBreakdown,
  type InstitutionPulseWeekTrend,
  type InstitutionRiskBreakdown,
} from "@/lib/supabase/wellbeing-institution-db";
import { institutionKeyFromUniversity } from "@/lib/wellbeing/institution-pulse-build";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

function TrendBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-violet-400/80 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EnergyTrendChart({ trends }: { trends: InstitutionPulseWeekTrend[] }) {
  const t = wellbeingCopy.es;
  const maxEnergy = useMemo(
    () => Math.max(5, ...trends.map((w) => w.avgEnergy7d ?? 0)),
    [trends],
  );

  if (trends.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.institutionDashEnergyTrend}</p>
      <div className="flex items-end gap-2 h-28">
        {trends.map((week) => {
          const energy = week.avgEnergy7d ?? 0;
          const h = maxEnergy > 0 ? `${Math.round((energy / maxEnergy) * 100)}%` : "4px";
          return (
            <div key={week.weekStart} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full max-w-10 rounded-t-md bg-gradient-to-t from-violet-600/80 to-indigo-400/80"
                style={{ height: h, minHeight: energy > 0 ? "8px" : "4px" }}
                title={`${week.weekStart}: ${energy || "—"}/5`}
              />
              <span className="text-[10px] text-slate-500">{week.weekStart.slice(5)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function InstitutionWellbeingDashboard() {
  const t = wellbeingCopy.es;
  const { profile, authUserId } = useKampus();
  const [trends, setTrends] = useState<InstitutionPulseWeekTrend[]>([]);
  const [breakdown, setBreakdown] = useState<InstitutionRiskBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const institutionKey = institutionKeyFromUniversity(profile.university);

  useEffect(() => {
    if (!authUserId || !isSupabaseConfigured() || !institutionKey) {
      setTrends([]);
      setBreakdown(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const [trendData, riskData] = await Promise.all([
          fetchInstitutionWellbeingPulseTrends(supabase, institutionKey),
          fetchInstitutionWellbeingRiskBreakdown(supabase, institutionKey),
        ]);
        if (!cancelled) {
          setTrends(trendData);
          setBreakdown(riskData);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t.institutionDashError);
          setTrends([]);
          setBreakdown(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId, institutionKey, t.institutionDashError]);

  if (!institutionKey) return null;

  const riskTotal = breakdown ? breakdown.okCount + breakdown.watchCount + breakdown.elevatedCount : 0;

  return (
    <Card className="border-indigo-400/25 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-indigo-300" aria-hidden />
          {t.institutionDashTitle}
        </CardTitle>
        <CardDescription>{t.institutionDashHint}</CardDescription>
      </CardHeader>
      <div className="space-y-6 px-6 pb-6">
        {loading ? <p className="text-sm text-slate-400">{t.institutionDashLoading}</p> : null}
        {error ? <p className="text-sm text-rose-200">{error}</p> : null}

        {!loading && breakdown && breakdown.sampleSize > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatBlock
                label={t.institutionDashParticipation}
                value={breakdown.sampleSize}
                hint={t.institutionPulseSampleHint}
              />
              <StatBlock
                label={t.institutionDashAvgLowMood}
                value={breakdown.avgLowMoodDays ?? "—"}
                hint={t.institutionDashAvgLowMoodHint}
              />
              <StatBlock
                label={t.institutionDashAvgStress}
                value={breakdown.avgStressTags ?? "—"}
                hint={t.institutionDashAvgStressHint}
              />
              <StatBlock
                label={t.institutionDashActiveSignals}
                value={breakdown.watchCount + breakdown.elevatedCount}
                hint={t.institutionPulseSignalsHint(breakdown.watchCount, breakdown.elevatedCount)}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 space-y-3">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <TrendingUp className="h-4 w-4 text-violet-300" aria-hidden />
                  {t.institutionDashRiskMix}
                </p>
                <TrendBar label={t.riskLevelOk} value={breakdown.okCount} max={riskTotal} />
                <TrendBar label={t.riskLevelWatch} value={breakdown.watchCount} max={riskTotal} />
                <TrendBar label={t.riskLevelElevated} value={breakdown.elevatedCount} max={riskTotal} />
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <EnergyTrendChart trends={trends} />
              </div>
            </div>
          </>
        ) : null}

        {!loading && !error && (!breakdown || breakdown.sampleSize === 0) ? (
          <p className="text-sm text-slate-400">{t.institutionDashEmpty}</p>
        ) : null}
      </div>
    </Card>
  );
}
