"use client";

import Link from "next/link";
import { CalendarClock, Microscope, Presentation, Video } from "lucide-react";

import { useCollaborationNextFocus } from "@/hooks/use-collaboration-next-focus";
import { usePendingStudentWorksCount } from "@/hooks/use-pending-student-works-count";
import { useUpcomingPresentationsCount } from "@/hooks/use-upcoming-presentations-count";
import { useUpcomingVirtualSessions } from "@/hooks/use-upcoming-virtual-sessions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { collaborateCopy } from "@/lib/i18n/collaborate";

function daysTone(days: number) {
  if (days < 0) return "neutral" as const;
  if (days <= 3) return "danger" as const;
  if (days <= 7) return "warning" as const;
  return "success" as const;
}

export function TodayCollaboratePanel() {
  const t = collaborateCopy.es;
  const pendingWorks = usePendingStudentWorksCount();
  const upcomingPresentations = useUpcomingPresentationsCount();
  const { next, loading: focusLoading } = useCollaborationNextFocus();
  const { next: virtualSession, loading: virtualLoading } = useUpcomingVirtualSessions(24);

  const hasCounts = pendingWorks > 0 || upcomingPresentations > 0;
  const hasFocus = !focusLoading && next !== null;
  const hasVirtual = !virtualLoading && virtualSession !== null;

  if (!hasCounts && !hasFocus && !hasVirtual) return null;

  return (
    <Card className="border-sky-400/25 bg-gradient-to-br from-sky-500/10 via-indigo-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Presentation className="h-5 w-5 text-sky-300" aria-hidden />
          {t.todayPanelTitle}
        </CardTitle>
        <CardDescription>{t.todayPanelHint}</CardDescription>
      </CardHeader>

      <div className="space-y-4 px-6 pb-6">
        {hasFocus && next ? (
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 px-4 py-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-3">
                <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" aria-hidden />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-200/80">
                    {t.nextFocusTitle}
                  </div>
                  <div className="font-medium text-white">{next.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                    <span>{next.date}</span>
                    <Badge tone={daysTone(next.daysUntil)}>
                      {next.daysUntil < 0
                        ? t.nextFocusOverdue(next.daysUntil)
                        : next.daysUntil === 0
                          ? t.nextFocusToday
                          : t.nextFocusDays(next.daysUntil)}
                    </Badge>
                  </div>
                </div>
              </div>
              <Link href={next.href}>
                <Button size="sm">{t.nextFocusCta}</Button>
              </Link>
            </div>
          </div>
        ) : null}

        {hasVirtual && virtualSession ? (
          <div className="rounded-xl border border-teal-400/20 bg-teal-500/5 px-4 py-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-3">
                <Video className="mt-0.5 h-5 w-5 shrink-0 text-teal-200" aria-hidden />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-teal-200/80">
                    {t.todayVirtualSessionTitle}
                  </div>
                  <div className="font-medium text-white">{virtualSession.course}</div>
                  <div className="mt-1 text-sm text-slate-400">
                    {t.todayVirtualSessionWhen(virtualSession.hoursUntil)}
                  </div>
                </div>
              </div>
              <Link href={virtualSession.href}>
                <Button size="sm" variant="secondary">
                  {t.todayVirtualSessionCta}
                </Button>
              </Link>
            </div>
          </div>
        ) : null}

        {hasCounts ? (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <ul className="space-y-1 text-sm text-slate-300">
              {pendingWorks > 0 ? (
                <li className="flex items-center gap-2">
                  <Microscope className="h-4 w-4 text-indigo-300" aria-hidden />
                  {t.todayPendingWorks(pendingWorks)}
                </li>
              ) : null}
              {upcomingPresentations > 0 ? (
                <li className="flex items-center gap-2">
                  <Presentation className="h-4 w-4 text-violet-300" aria-hidden />
                  {t.todayUpcomingPresentations(upcomingPresentations)}
                </li>
              ) : null}
            </ul>

            <div className="flex flex-wrap gap-2">
              <Link href="/collaborate">
                <Button size="sm">{t.todayOpenHubCta}</Button>
              </Link>
              {pendingWorks > 0 ? (
                <Link href="/collaborate/investigaciones">
                  <Button size="sm" variant="secondary">
                    {t.todayWorksCta}
                  </Button>
                </Link>
              ) : null}
              {upcomingPresentations > 0 ? (
                <Link href="/collaborate/exposiciones">
                  <Button size="sm" variant="ghost">
                    {t.todayPresentationsCta}
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
