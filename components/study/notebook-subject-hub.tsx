"use client";

import { CalendarDays, Sparkles, Upload, Zap } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { libraryCopy } from "@/lib/i18n/library";
import type { NotebookClassSummary, NotebookSubjectStats } from "@/lib/study/notebook-class-summary";
import { buildPressureQuizPath } from "@/lib/study/pressure-quiz";

type NotebookSubjectHubProps = {
  subject: string;
  subjectSlug: string;
  stats: NotebookSubjectStats;
  classes: NotebookClassSummary[];
  onUploadClick?: () => void;
  focusTopic?: string | null;
};

export function NotebookSubjectHub({
  subject,
  subjectSlug,
  stats,
  classes,
  onUploadClick,
  focusTopic,
}: NotebookSubjectHubProps) {
  const t = libraryCopy.es;
  const quizHref = buildPressureQuizPath(subject);
  const kitHref = `/study/notebook/${subjectSlug}?kit=1`;
  const uploadHref = `/study/notebook/${subjectSlug}?upload=1`;
  const recent = classes.filter((c) => c.classDate).slice(0, 5);

  return (
    <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="text-lg">{t.subjectHubTitle}</CardTitle>
        <CardDescription>{t.subjectHubHint}</CardDescription>
      </CardHeader>

      <div className="space-y-4 px-6 pb-6">
        {focusTopic ? (
          <p className="rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-100">
            Enfoque desde Modo aprobar: <strong className="text-white">{focusTopic}</strong>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Badge tone={stats.totalPages === 0 ? "danger" : stats.linkedPages === 0 ? "warning" : "success"}>
            {stats.totalPages} apunte{stats.totalPages === 1 ? "" : "s"}
          </Badge>
          <Badge tone="neutral">
            {stats.classSessionCount} clase{stats.classSessionCount === 1 ? "" : "s"}
          </Badge>
          {stats.unlinkedPages > 0 ? (
            <Badge tone="warning">{stats.unlinkedPages} sin vincular</Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {onUploadClick ? (
            <Button type="button" size="sm" variant="secondary" className="gap-1.5" onClick={onUploadClick}>
              <Upload className="h-3.5 w-3.5" aria-hidden />
              {t.quickUpload}
            </Button>
          ) : (
            <Link href={uploadHref}>
              <Button size="sm" variant="secondary" className="gap-1.5">
                <Upload className="h-3.5 w-3.5" aria-hidden />
                {t.quickUpload}
              </Button>
            </Link>
          )}
          <Link href={quizHref}>
            <Button size="sm" variant="secondary" className="gap-1.5">
              <Zap className="h-3.5 w-3.5" aria-hidden />
              {t.quickQuiz}
            </Button>
          </Link>
          <Link href={kitHref}>
            <Button size="sm" variant="ghost" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {t.subjectHubKit}
            </Button>
          </Link>
          <Link href="/exams/calendar">
            <Button size="sm" variant="ghost" className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              {t.openCalendarCta}
            </Button>
          </Link>
        </div>

        {recent.length ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t.subjectHubClasses}</p>
            <ul className="space-y-2">
              {recent.map((session) => (
                <li key={session.key}>
                  <Link
                    href={session.openHref}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
                  >
                    <span className="truncate text-slate-200">{session.label}</span>
                    <span className="ml-2 shrink-0 text-xs text-slate-400">
                      {session.pageCount} pág.
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : stats.totalPages > 0 ? (
          <p className="text-sm text-amber-100/90">{t.subjectHubUnlinkedHint}</p>
        ) : (
          <p className="text-sm text-slate-400">{t.subjectHubEmptyHint}</p>
        )}
      </div>
    </Card>
  );
}
