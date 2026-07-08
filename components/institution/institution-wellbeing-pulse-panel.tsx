"use client";

import { HeartPulse } from "lucide-react";
import { useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatBlock } from "@/components/ui/stat-block";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { fetchInstitutionWellbeingPulse, type InstitutionPulseAggregate } from "@/lib/supabase/wellbeing-institution-db";
import { institutionKeyFromUniversity } from "@/lib/wellbeing/institution-pulse-build";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

export function InstitutionWellbeingPulsePanel() {
  const t = wellbeingCopy.es;
  const { profile, authUserId } = useKampus();
  const [pulse, setPulse] = useState<InstitutionPulseAggregate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const institutionKey = institutionKeyFromUniversity(profile.university);

  useEffect(() => {
    if (!authUserId || !isSupabaseConfigured() || !institutionKey) {
      setPulse(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const data = await fetchInstitutionWellbeingPulse(supabase, institutionKey);
        if (!cancelled) setPulse(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t.institutionPulseError);
          setPulse(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId, institutionKey, t.institutionPulseError]);

  if (!institutionKey) return null;

  return (
    <Card className="border-violet-400/25 bg-gradient-to-br from-violet-500/10 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <HeartPulse className="h-5 w-5 text-violet-300" aria-hidden />
          {t.institutionPulseTitle}
        </CardTitle>
        <CardDescription>{t.institutionPulseHint}</CardDescription>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6">
        {loading ? <p className="text-sm text-slate-400">{t.institutionPulseLoading}</p> : null}
        {error ? <p className="text-sm text-rose-200">{error}</p> : null}
        {!loading && pulse && pulse.sampleSize > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatBlock label={t.institutionPulseSample} value={pulse.sampleSize} hint={t.institutionPulseSampleHint} />
            <StatBlock
              label={t.institutionPulseAvgEntries}
              value={pulse.avgEntries7d ?? "—"}
              hint={t.institutionPulseAvgEntriesHint}
            />
            <StatBlock
              label={t.institutionPulseAvgEnergy}
              value={pulse.avgEnergy7d ?? "—"}
              hint={t.institutionPulseAvgEnergyHint}
            />
            <StatBlock
              label={t.institutionPulseSignals}
              value={pulse.elevatedCount + pulse.watchCount}
              hint={t.institutionPulseSignalsHint(pulse.watchCount, pulse.elevatedCount)}
            />
          </div>
        ) : null}
        {!loading && !error && (!pulse || pulse.sampleSize === 0) ? (
          <p className="text-sm text-slate-400">{t.institutionPulseEmpty}</p>
        ) : null}
      </div>
    </Card>
  );
}
