"use client";

import Link from "next/link";
import { BarChart3, BellRing, BookMarked, Braces, Building2, Cloud, FileDown, Flame, GraduationCap, Heart, MessageCircle, Radar, Share2, ShieldCheck, Smartphone, SunMedium, WifiOff } from "lucide-react";

import { WellbeingCheckInReminder } from "@/components/wellbeing/wellbeing-check-in-reminder";
import { WellbeingCounselorAlertPanel } from "@/components/wellbeing/wellbeing-counselor-alert-panel";
import { WellbeingCounselorSharePanel } from "@/components/wellbeing/wellbeing-counselor-share-panel";
import { WellbeingHumanSupportPanel } from "@/components/wellbeing/wellbeing-human-support-panel";
import { WellbeingInstitutionOptIn } from "@/components/wellbeing/wellbeing-institution-opt-in";
import { WellbeingInsightsPanel } from "@/components/wellbeing/wellbeing-insights-panel";
import { WellbeingNotificationToggle } from "@/components/wellbeing/wellbeing-notification-toggle";
import { WellbeingPwaPanel } from "@/components/wellbeing/wellbeing-pwa-panel";
import { WellbeingServerPushPanel } from "@/components/wellbeing/wellbeing-server-push-panel";
import { WellbeingUniversityServicesPanel } from "@/components/wellbeing/wellbeing-university-services-panel";
import { WellbeingSubnav } from "@/components/wellbeing/wellbeing-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { useDiaryCheckInStatus } from "@/hooks/use-diary-check-in-status";
import { useDiaryPendingCount } from "@/hooks/use-diary-pending-count";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

export function WellbeingHub() {
  const t = wellbeingCopy.es;
  const { authUserId } = useKampus();
  const useCloud = Boolean(isSupabaseConfigured() && authUserId);
  const { hasCheckedInToday, streakDays, loading } = useDiaryCheckInStatus();
  const pendingCount = useDiaryPendingCount();

  const features = [
    { label: t.hubFeatureOffline, icon: WifiOff },
    { label: t.hubFeatureCloudChat, icon: Cloud },
    { label: t.hubFeatureInsights14d, icon: SunMedium },
    { label: t.hubFeatureCheckInReminder, icon: Flame },
    { label: t.hubFeatureExportPdf, icon: FileDown },
    { label: t.hubFeatureRadarBridge, icon: Radar },
    { label: t.hubFeatureHumanSupport, icon: Heart },
    { label: t.hubFeaturePwa, icon: Smartphone },
    { label: t.hubFeatureCounselorShare, icon: Share2 },
    { label: t.hubFeatureInstitutionPulse, icon: Building2 },
    { label: t.hubFeatureServerPush, icon: BellRing },
    { label: t.hubFeatureCounselorSigned, icon: ShieldCheck },
    { label: t.hubFeatureInstitutionDash, icon: BarChart3 },
    { label: t.hubFeatureCounselorAlert, icon: BellRing },
    { label: t.hubFeatureUniversityServices, icon: GraduationCap },
    { label: t.hubFeatureFhirExport, icon: Braces },
  ] as const;

  return (
    <div className="space-y-10">
      <PageHeader eyebrow={t.eyebrow} title={t.hubTitle} description={t.hubDescription} />

      <WellbeingSubnav />

      <WellbeingCheckInReminder />

      <WellbeingNotificationToggle />

      <WellbeingPwaPanel />

      <WellbeingServerPushPanel />

      {pendingCount > 0 ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          {t.pendingQueueBanner(pendingCount)}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {features.map(({ label, icon: Icon }) => (
          <Badge key={label} tone="neutral" className="gap-1.5 px-3 py-1.5 text-xs">
            <Icon className="h-3.5 w-3.5 opacity-80" aria-hidden />
            {label}
          </Badge>
        ))}
      </div>

      <WellbeingInsightsPanel />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-indigo-400/25 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BookMarked className="h-5 w-5 text-indigo-300" aria-hidden />
              {t.diaryCardTitle}
            </CardTitle>
            <CardDescription>{useCloud ? t.diaryCardHintOffline : t.diaryCardHint}</CardDescription>
          </CardHeader>
          <div className="space-y-3 px-6 pb-6">
            {!loading ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                <SunMedium className="h-4 w-4 text-amber-300" aria-hidden />
                {hasCheckedInToday ? t.checkedInToday : t.notCheckedInToday}
                {streakDays > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-100">
                    <Flame className="h-3.5 w-3.5" aria-hidden />
                    {t.streakLabel(streakDays)}
                  </span>
                ) : null}
              </div>
            ) : null}
            <Link href="/wellbeing/diary">
              <Button className="w-full sm:w-auto">{t.diaryCardCta}</Button>
            </Link>
          </div>
        </Card>

        <Card className="border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MessageCircle className="h-5 w-5 text-emerald-300" aria-hidden />
              {t.psychologistCardTitle}
            </CardTitle>
            <CardDescription>{useCloud ? t.psychologistCardHintCloud : t.psychologistCardHint}</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Link href="/wellbeing/psychologist">
              <Button variant="secondary" className="w-full sm:w-auto">
                {t.psychologistCardCta}
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      <WellbeingCounselorSharePanel />

      <WellbeingCounselorAlertPanel />

      <WellbeingUniversityServicesPanel />

      <WellbeingInstitutionOptIn />

      <WellbeingHumanSupportPanel />

      <p className="text-sm text-slate-500">{t.hubSyncHint}</p>

      <Card className="border-white/10 bg-slate-950/40">
        <CardHeader>
          <CardTitle>{t.roadmapTitle}</CardTitle>
          <CardDescription>{t.roadmapHint}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
