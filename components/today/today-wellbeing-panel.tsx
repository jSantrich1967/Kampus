"use client";

import Link from "next/link";
import { Flame, Heart, MessageCircle } from "lucide-react";
import { useMemo } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { useDiaryCheckInStatus } from "@/hooks/use-diary-check-in-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildDiaryTodayHref } from "@/lib/wellbeing/diary-path";
import { WellbeingCheckInReminder } from "@/components/wellbeing/wellbeing-check-in-reminder";
import { buildPsychologistHref } from "@/lib/wellbeing/psychologist-path";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

function daysTone(days: number) {
  if (days <= 3) return "danger" as const;
  if (days <= 7) return "warning" as const;
  return "success" as const;
}

function daysUntil(isoDate: string): number | null {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d);
  target.setHours(12, 0, 0, 0);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function TodayWellbeingPanel() {
  const t = wellbeingCopy.es;
  const { profile } = useKampus();
  const { hasCheckedInToday, streakDays, todayEntryId, todayMood, todayEnergy, loading } =
    useDiaryCheckInStatus();

  const nearestExam = useMemo(() => {
    return profile.upcomingExams
      .map((e) => ({ ...e, days: daysUntil(e.date) }))
      .filter((e) => e.days !== null && e.days >= 0)
      .sort((a, b) => (a.days ?? 99) - (b.days ?? 99))[0];
  }, [profile.upcomingExams]);

  const showStressCta = Boolean(nearestExam && nearestExam.days !== null && nearestExam.days <= 7);

  return (
    <Card className="border-violet-400/25 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Heart className="h-5 w-5 text-violet-300" aria-hidden />
          {t.todayPanelTitle}
        </CardTitle>
        <CardDescription>{t.todayPanelHint}</CardDescription>
      </CardHeader>

      <div className="space-y-4 px-6 pb-6">
        <WellbeingCheckInReminder compact />

        {showStressCta && nearestExam ? (
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 px-4 py-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-violet-100/90">{t.todayStressHint(nearestExam.subject, nearestExam.days!)}</p>
                <Badge tone={daysTone(nearestExam.days!)} className="mt-2">
                  {nearestExam.days === 0 ? "Hoy" : nearestExam.days === 1 ? "Mañana" : `En ${nearestExam.days} días`}
                </Badge>
              </div>
              <Link
                href={buildPsychologistHref({
                  subject: nearestExam.subject,
                  days: nearestExam.days!,
                })}
              >
                <Button size="sm" variant="secondary" className="gap-1.5">
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  {t.todayStressCta}
                </Button>
              </Link>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2 text-sm text-slate-300">
            {!loading ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {hasCheckedInToday ? (
                    <span className="text-emerald-200/90">{t.checkedInToday}</span>
                  ) : (
                    <span>{t.notCheckedInToday}</span>
                  )}
                  {streakDays > 0 ? (
                    <span className="inline-flex items-center gap-1 text-amber-200/90">
                      <Flame className="h-4 w-4" aria-hidden />
                      {t.todayStreak(streakDays)}
                    </span>
                  ) : null}
                </div>
                {hasCheckedInToday && todayMood && todayEnergy !== null ? (
                  <p className="text-slate-400">{t.todayInsightMood(todayMood, todayEnergy)}</p>
                ) : null}
              </>
            ) : (
              <span className="text-slate-500">…</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={hasCheckedInToday ? buildDiaryTodayHref(todayEntryId ?? undefined) : "/wellbeing/diary"}>
              <Button size="sm" variant={hasCheckedInToday ? "secondary" : "primary"}>
                {hasCheckedInToday ? t.todayCheckedInCta : t.todayCheckInCta}
              </Button>
            </Link>
            <Link href="/wellbeing">
              <Button size="sm" variant="ghost">
                {t.todayOpenWellbeingCta}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
