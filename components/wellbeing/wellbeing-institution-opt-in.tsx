"use client";

import { Building2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDiaryInsights } from "@/hooks/use-diary-insights";
import { useWellbeingRiskSignal } from "@/hooks/use-wellbeing-risk-signal";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  deleteWellbeingInstitutionContribution,
  upsertWellbeingInstitutionContribution,
} from "@/lib/supabase/wellbeing-institution-db";
import {
  buildInstitutionPulse,
  institutionKeyFromUniversity,
  weekStartForPulse,
} from "@/lib/wellbeing/institution-pulse-build";
import {
  loadInstitutionWellbeingOptIn,
  saveInstitutionWellbeingOptIn,
} from "@/lib/wellbeing/institution-pulse-storage";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

export function WellbeingInstitutionOptIn() {
  const t = wellbeingCopy.es;
  const { profile, authUserId } = useKampus();
  const { insights } = useDiaryInsights();
  const { signal } = useWellbeingRiskSignal();
  const [optIn, setOptIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const institutionKey = institutionKeyFromUniversity(profile.university);
  const canSync = Boolean(isSupabaseConfigured() && authUserId && institutionKey);

  useEffect(() => {
    setHydrated(true);
    setOptIn(loadInstitutionWellbeingOptIn());
  }, []);

  const syncPulse = useCallback(async () => {
    if (!canSync || !authUserId || !institutionKey) return;
    const pulse = buildInstitutionPulse(insights, signal);
    const supabase = createSupabaseBrowserClient();
    await upsertWellbeingInstitutionContribution(supabase, authUserId, institutionKey, weekStartForPulse(), pulse);
  }, [canSync, authUserId, institutionKey, insights, signal]);

  useEffect(() => {
    if (!hydrated || !optIn || !canSync) return;
    void syncPulse().catch(() => {
      /* silent — user can retry via toggle */
    });
  }, [hydrated, optIn, canSync, syncPulse]);

  async function toggle() {
    setMessage(null);
    setBusy(true);
    try {
      if (optIn) {
        saveInstitutionWellbeingOptIn(false);
        setOptIn(false);
        if (canSync && authUserId) {
          const supabase = createSupabaseBrowserClient();
          await deleteWellbeingInstitutionContribution(supabase, authUserId, weekStartForPulse());
        }
        setMessage(t.institutionOptOutOk);
      } else {
        if (!institutionKey) {
          setMessage(t.institutionOptInNoUniversity);
          return;
        }
        saveInstitutionWellbeingOptIn(true);
        setOptIn(true);
        if (canSync) await syncPulse();
        setMessage(t.institutionOptInOk);
      }
    } catch {
      setMessage(t.institutionOptInError);
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated) return null;

  return (
    <Card className="border-amber-400/20 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-amber-300" aria-hidden />
          {t.institutionOptInTitle}
        </CardTitle>
        <CardDescription>{t.institutionOptInHint}</CardDescription>
      </CardHeader>
      <div className="space-y-3 px-6 pb-5">
        <Button type="button" size="sm" variant={optIn ? "secondary" : "primary"} disabled={busy} onClick={() => void toggle()}>
          {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          {optIn ? t.institutionOptInOff : t.institutionOptInOn}
        </Button>
        {message ? <p className="text-sm text-slate-300">{message}</p> : null}
        {!canSync ? <p className="text-xs text-slate-500">{t.institutionOptInLocalOnly}</p> : null}
      </div>
    </Card>
  );
}
