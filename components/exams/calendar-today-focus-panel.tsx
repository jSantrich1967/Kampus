"use client";

import { CalendarDays, Clock } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { useTodayContext } from "@/components/today/use-today-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { daysUntilDate } from "@/lib/calendar/calendar-urgency";
import { calendarCopy } from "@/lib/i18n/calendar";
import { todayCopy } from "@/lib/i18n/today";
import { buildPassModeSubjectHref } from "@/lib/today/block-action-href";
import { buildCommunityExamHref } from "@/lib/community/channels";
import { useUpcomingExamsSync } from "@/hooks/use-upcoming-exams-sync";

export function CalendarTodayFocusPanel() {
  const t = calendarCopy.es;
  const todayT = todayCopy.es;
  const { profile } = useKampus();
  useUpcomingExamsSync();
  const { loading, todayClasses, hasSchedule } = useTodayContext([]);

  const nearestExam = useMemo(() => {
    return profile.upcomingExams
      .map((e) => ({ ...e, days: daysUntilDate(e.date) }))
      .filter((e) => e.days !== null && e.days >= 0)
      .sort((a, b) => (a.days ?? 99) - (b.days ?? 99))[0];
  }, [profile.upcomingExams]);

  const showExam = Boolean(nearestExam && nearestExam.days !== null && nearestExam.days <= 14);
  const showClasses = todayClasses.length > 0;
  const showEmptySchedule = !hasSchedule && !loading;

  if (!showExam && !showClasses && !showEmptySchedule) return null;

  return (
    <Card className="border-indigo-400/25 bg-gradient-to-br from-indigo-500/10 via-sky-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <CalendarDays className="h-5 w-5 text-indigo-300" aria-hidden />
          {t.todayFocusTitle}
        </CardTitle>
        <CardDescription>{t.todayFocusHint}</CardDescription>
      </CardHeader>

      <div className="grid gap-4 px-6 pb-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-200">{t.todayClassesTitle}</div>
          {loading && todayClasses.length === 0 ? (
            <p className="text-sm text-slate-400">{todayT.classTodayLoading}</p>
          ) : showClasses ? (
            todayClasses.map((slot) => (
              <div key={`${slot.id}-${slot.classDate}`} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-white">{slot.subject}</span>
                  {slot.hasNotesForToday ? (
                    <Badge tone="success">{t.classNotesReady}</Badge>
                  ) : (
                    <Badge tone="warning">{t.classNotesMissing}</Badge>
                  )}
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {slot.startTime}–{slot.endTime}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link href={slot.hasNotesForToday ? slot.reviewHref : slot.uploadHref}>
                    <Button size="sm" variant="secondary">
                      {slot.hasNotesForToday ? todayT.reviewClassNotesCta : todayT.uploadAfterClassCta}
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          ) : showEmptySchedule ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              {t.noSchedule}
            </div>
          ) : (
            <p className="text-sm text-slate-400">{t.noClassesToday}</p>
          )}
        </div>

        {showExam && nearestExam ? (
          <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-4">
            <div className="text-sm font-semibold text-amber-100">{t.nearestExamTitle}</div>
            <p className="mt-1 text-sm text-amber-50/90">{t.nearestExamHint(nearestExam.subject, nearestExam.days!)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={buildPassModeSubjectHref(nearestExam.subject)}>
                <Button size="sm">{t.passModeCta}</Button>
              </Link>
              <Link href="/exams">
                <Button size="sm" variant="secondary">
                  {t.nearestExamCta}
                </Button>
              </Link>
              <Link href={buildCommunityExamHref(nearestExam.subject, nearestExam.date)}>
                <Button size="sm" variant="ghost">
                  {t.communityExamCta}
                </Button>
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
