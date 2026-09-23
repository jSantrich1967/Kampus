"use client";

import { CalendarClock, ArrowRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { examsCopy } from "@/lib/i18n/exams";
import { buildCommunityExamHref } from "@/lib/community/channels";
import { buildPsychologistHref } from "@/lib/wellbeing/psychologist-path";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";
import type { ExamListInsight } from "@/lib/exams/exam-insights";

type StudentNextExamPanelProps = {
  next: ExamListInsight;
};

function daysTone(days: number | null) {
  if (days === null) return "neutral" as const;
  if (days < 0) return "neutral" as const;
  if (days <= 3) return "danger" as const;
  if (days <= 7) return "warning" as const;
  return "success" as const;
}

export function StudentNextExamPanel({ next }: StudentNextExamPanelProps) {
  const t = examsCopy.es;
  const wb = wellbeingCopy.es;
  const { exam, daysUntil, estimatedTime } = next;
  const showStress = daysUntil !== null && daysUntil >= 0 && daysUntil <= 7;

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
          <CalendarClock className="h-5 w-5 text-amber-300" aria-hidden />
          {t.nextExamTitle}
        </CardTitle>
        <CardDescription>{t.nextExamHint}</CardDescription>
      </CardHeader>

      <div className="flex flex-col gap-4 px-6 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-lg font-semibold text-white">{exam.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-300">
            <span>{exam.subject}</span>
            {exam.dueDate ? <span className="text-slate-500">· {t.dueOn(exam.dueDate)}</span> : null}
            <Badge tone="neutral">{t.estimatedTime(estimatedTime)}</Badge>
            {daysUntil !== null ? (
              <Badge tone={daysTone(daysUntil)}>
                {daysUntil < 0 ? t.daysOverdue(daysUntil) : t.daysLeft(daysUntil)}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/exams/student/${exam.id}`} className={buttonClasses({ className: "gap-2" })}>
            {t.nextExamCta}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          {exam.dueDate ? (
            <Link
              href={buildCommunityExamHref(exam.subject, exam.dueDate)}
              className={buttonClasses({ variant: "secondary" })}
            >
              {t.communityExamCta}
            </Link>
          ) : null}
          {showStress ? (
            <Link
              href={buildPsychologistHref({ subject: exam.subject, days: daysUntil! })}
              className={buttonClasses({ variant: "ghost" })}
            >
              {wb.examStressCta}
            </Link>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
