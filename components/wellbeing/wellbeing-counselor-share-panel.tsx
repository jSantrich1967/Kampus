"use client";

import { Check, Copy, Loader2, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { useKampus } from "@/components/kampus/kampus-provider";
import { useDiaryCheckInStatus } from "@/hooks/use-diary-check-in-status";
import { useDiaryInsights } from "@/hooks/use-diary-insights";
import { useWellbeingRiskSignal } from "@/hooks/use-wellbeing-risk-signal";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { appendCounselorSignatureBlock, counselorPayloadFromShare } from "@/lib/wellbeing/counselor-sign-shared";
import {
  buildCounselorMailto,
  buildCounselorShareSummary,
} from "@/lib/wellbeing/counselor-summary";
import { currentWeekStartIso } from "@/lib/wellbeing/institution-pulse-storage";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

export function WellbeingCounselorSharePanel() {
  const t = wellbeingCopy.es;
  const { profile, authUserId } = useKampus();
  const { insights, loading: insightsLoading } = useDiaryInsights();
  const { signal, loading: riskLoading } = useWellbeingRiskSignal();
  const { streakDays } = useDiaryCheckInStatus();
  const [copied, setCopied] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signedSummary, setSignedSummary] = useState<string | null>(null);
  const [signError, setSignError] = useState<string | null>(null);

  const sharePayload = useMemo(
    () => ({
      studentLabel: profile.displayName || "Estudiante",
      university: profile.university,
      weekOf: currentWeekStartIso(),
      streakDays,
      insights,
      risk: signal,
    }),
    [profile.displayName, profile.university, streakDays, insights, signal],
  );

  const baseSummary = useMemo(() => buildCounselorShareSummary(sharePayload), [sharePayload]);

  const canSign = Boolean(authUserId && isSupabaseConfigured());

  useEffect(() => {
    if (!canSign) {
      setSignedSummary(null);
      return;
    }
    let cancelled = false;
    setSigning(true);
    setSignError(null);
    void (async () => {
      try {
        const res = await fetch("/api/wellbeing/counselor/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sharePayload),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          signature?: string;
          signedAt?: string;
          verifyUrl?: string;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !json.ok || !json.signature || !json.signedAt || !json.verifyUrl) {
          setSignedSummary(null);
          setSignError(json.error ?? null);
          return;
        }
        const signPayload = counselorPayloadFromShare(sharePayload);
        setSignedSummary(
          appendCounselorSignatureBlock(baseSummary, signPayload, json.signature, json.signedAt, json.verifyUrl),
        );
      } catch {
        if (!cancelled) setSignedSummary(null);
      } finally {
        if (!cancelled) setSigning(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [baseSummary, canSign, sharePayload]);

  const summary = signedSummary ?? baseSummary;
  const mailto = useMemo(() => buildCounselorMailto(summary, profile.displayName), [summary, profile.displayName]);

  if (insightsLoading || riskLoading) return null;
  if (insights.entriesLast14Days === 0 && streakDays === 0) return null;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card className="border-sky-400/20 bg-gradient-to-br from-sky-500/10 to-transparent">
      <CardHeader>
        <CardTitle className="text-lg">{t.counselorShareTitle}</CardTitle>
        <CardDescription>{t.counselorShareHint}</CardDescription>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6">
        {signing ? (
          <p className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            {t.counselorShareSigning}
          </p>
        ) : null}
        {signedSummary ? (
          <p className="flex items-center gap-2 text-xs text-emerald-200/90">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            {t.counselorShareSignedHint}
          </p>
        ) : signError ? (
          <p className="text-xs text-amber-200/90">{t.counselorShareUnsignedHint}</p>
        ) : !canSign ? (
          <p className="text-xs text-slate-500">{t.counselorShareLoginForSign}</p>
        ) : null}
        <pre className="max-h-48 overflow-auto rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-300 whitespace-pre-wrap">
          {summary}
        </pre>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" className="gap-1.5" onClick={() => void onCopy()}>
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? t.counselorShareCopied : t.counselorShareCopy}
          </Button>
          <a href={mailto}>
            <Button type="button" size="sm" variant="secondary" className="gap-1.5">
              <Mail className="h-3.5 w-3.5" aria-hidden />
              {t.counselorShareEmail}
            </Button>
          </a>
          <ShareLinkButton
            pathname="/wellbeing"
            campaign="wellbeing_counselor"
            refHandle={profile.university || "kampus"}
            label={t.counselorShareLink}
            copiedLabel={t.counselorShareCopied}
          />
          <Link href="/wellbeing/counselor-verify">
            <Button type="button" size="sm" variant="ghost" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              {t.counselorVerifyLink}
            </Button>
          </Link>
        </div>
        <p className="text-[11px] text-slate-500">{t.counselorSharePrivacy}</p>
      </div>
    </Card>
  );
}
