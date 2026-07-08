"use client";

import { Download, Webhook } from "lucide-react";
import { useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { fetchInstitutionWellbeingPulseTrends } from "@/lib/supabase/wellbeing-institution-db";
import { downloadCsv, institutionPulseTrendsToCsv } from "@/lib/wellbeing/institution-pulse-csv";
import { institutionKeyFromUniversity } from "@/lib/wellbeing/institution-pulse-build";
import { localIsoDate } from "@/lib/calendar/local-iso-date";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

export function InstitutionWellbeingIntegrationPanel() {
  const t = wellbeingCopy.es;
  const { profile, authUserId } = useKampus();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const institutionKey = institutionKeyFromUniversity(profile.university);

  async function exportCsv() {
    if (!authUserId || !isSupabaseConfigured() || !institutionKey) return;
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const trends = await fetchInstitutionWellbeingPulseTrends(supabase, institutionKey);
      if (trends.length === 0) {
        setMessage(t.institutionIntegrationCsvEmpty);
        return;
      }
      const csv = institutionPulseTrendsToCsv(institutionKey, trends);
      downloadCsv(csv, `kampus-pulse-${institutionKey}-${localIsoDate()}.csv`);
      setMessage(t.institutionIntegrationCsvOk);
    } catch {
      setMessage(t.institutionIntegrationCsvError);
    } finally {
      setBusy(false);
    }
  }

  if (!institutionKey) return null;

  return (
    <Card className="border-teal-400/25 bg-teal-950/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Webhook className="h-5 w-5 text-teal-300" aria-hidden />
          {t.institutionIntegrationTitle}
        </CardTitle>
        <CardDescription>{t.institutionIntegrationHint}</CardDescription>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6">
        <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4 text-xs text-slate-400">
          <p className="font-medium text-slate-300">{t.institutionIntegrationWebhookTitle}</p>
          <p className="mt-2">{t.institutionIntegrationWebhookHint}</p>
          <code className="mt-2 block break-all text-teal-200/90">wellbeing.counselor_alert</code>
        </div>
        <Button type="button" size="sm" variant="secondary" disabled={busy || !authUserId} onClick={() => void exportCsv()} className="gap-1.5">
          <Download className="h-3.5 w-3.5" aria-hidden />
          {t.institutionIntegrationCsvCta}
        </Button>
        {message ? <p className="text-sm text-slate-300">{message}</p> : null}
      </div>
    </Card>
  );
}
