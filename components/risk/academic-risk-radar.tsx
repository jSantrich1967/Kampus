"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";

import { AcademicRadarOnboardingPanel } from "@/components/risk/academic-radar-onboarding-panel";
import { ShareLinkButton } from "@/components/growth/share-link-button";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { useAcademicRadarData } from "@/hooks/use-academic-radar-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WellbeingRadarBridgePanel } from "@/components/wellbeing/wellbeing-radar-bridge-panel";
import { radarCopy } from "@/lib/i18n/radar";
import { buildSubjectRisks } from "@/lib/pass-mode";
import {
  countPendingResearchWorks,
  enhanceSubjectRisksWithResearch,
} from "@/lib/radar/enhance-subject-risks-with-research";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function tone(risk: "low" | "medium" | "high") {
  if (risk === "high") return "danger" as const;
  if (risk === "medium") return "warning" as const;
  return "success" as const;
}

export function AcademicRiskRadar() {
  const { profile, authUserId } = useKampus();
  const t = radarCopy.es;
  const useCloud = Boolean(isSupabaseConfigured() && authUserId);
  const { works, loading, refresh } = useAcademicRadarData();

  const risks = useMemo(() => {
    const base = buildSubjectRisks(profile);
    return enhanceSubjectRisksWithResearch(base, works);
  }, [profile, works]);

  const pendingResearch = countPendingResearchWorks(works);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={
          <ShareLinkButton
            pathname="/risk"
            campaign="academic_radar"
            refHandle={profile.university || "kampus"}
            label={t.shareLabel}
            copiedLabel={t.shareCopied}
          />
        }
      />

      <AcademicRadarOnboardingPanel useCloud={useCloud} onRefreshed={refresh} />

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t.dataLoading}
        </p>
      ) : null}

      {pendingResearch > 0 ? (
        <p className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-100/90">
          {t.researchSignal(pendingResearch)}{" "}
          <Link href="/collaborate/investigaciones" className="underline-offset-2 hover:underline">
            {t.researchCta}
          </Link>
        </p>
      ) : null}

      <WellbeingRadarBridgePanel variant="radar" />

      {profile.subjects.length === 0 ? (
        <Card className="border-white/10 bg-slate-950/40">
          <CardHeader>
            <CardDescription>{t.emptySubjects}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {risks.map((r) => (
            <Card key={r.subject}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{r.subject}</CardTitle>
                  <Badge tone={tone(r.risk)}>{r.risk}</Badge>
                </div>
                <CardDescription>{r.nextAction}</CardDescription>
              </CardHeader>
              <div className="space-y-2 px-6 pb-6">
                <Progress value={r.score} />
                <ul className="space-y-2 text-sm text-slate-300">
                  {r.reasons.map((reason) => (
                    <li key={reason} className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">
                      {reason}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2 pt-2">
                  {profile.role === "student" ? (
                    <Link href="/pass-mode">
                      <Button size="sm" variant="secondary">
                        {t.passModeCta}
                      </Button>
                    </Link>
                  ) : null}
                  {profile.role === "student" || profile.role === "teacher" ? (
                    <Link href="/study/library/rescue">
                      <Button size="sm" variant="ghost">
                        Kit de estudios
                      </Button>
                    </Link>
                  ) : null}
                  <Link href="/collaborate/investigaciones">
                    <Button size="sm" variant="ghost">
                      {t.researchCta}
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
