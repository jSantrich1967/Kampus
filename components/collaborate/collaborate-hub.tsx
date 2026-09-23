"use client";

import Link from "next/link";
import { Microscope, Presentation, Timer, Video } from "lucide-react";

import { CollaborateDeadlineNotifyPanel } from "@/components/collaborate/collaborate-deadline-notify-panel";
import { CollaborateNextFocusPanel } from "@/components/collaborate/collaborate-next-focus-panel";
import { CollaborateSubnav } from "@/components/collaborate/collaborate-subnav";
import { useUpcomingVirtualSessions } from "@/hooks/use-upcoming-virtual-sessions";
import { PageHeader } from "@/components/layout/page-header";
import { usePendingStudentWorksCount } from "@/hooks/use-pending-student-works-count";
import { useUpcomingPresentationsCount } from "@/hooks/use-upcoming-presentations-count";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatBlock } from "@/components/ui/stat-block";
import { collaborateCopy } from "@/lib/i18n/collaborate";

export function CollaborateHub() {
  const t = collaborateCopy.es;
  const pendingWorks = usePendingStudentWorksCount();
  const upcomingPresentations = useUpcomingPresentationsCount();
  const { next: virtualSession } = useUpcomingVirtualSessions(24);


  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Clases"
        title="Clases"
        description="Tus sesiones en vivo, exposiciones, trabajos y sala de estudio, en un solo lugar."
      />

      <CollaborateSubnav />


      <CollaborateDeadlineNotifyPanel />

      <CollaborateNextFocusPanel />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatBlock label={t.statPendingWorks} value={pendingWorks} hint={t.researchHint} />
        <StatBlock label={t.statUpcomingPresentations} value={upcomingPresentations} hint={t.presentationsHint} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-violet-400/25 bg-gradient-to-br from-violet-500/10 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Presentation className="h-5 w-5 text-violet-300" aria-hidden />
              {t.presentationsTitle}
            </CardTitle>
            <CardDescription>{t.presentationsHint}</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Link href="/collaborate/exposiciones" className={buttonClasses({ variant: "primary", className: "w-full sm:w-auto" })}>{t.presentationsCta}</Link>
          </div>
        </Card>

        <Card className="border-indigo-400/25 bg-gradient-to-br from-indigo-500/10 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Microscope className="h-5 w-5 text-indigo-300" aria-hidden />
              {t.researchTitle}
            </CardTitle>
            <CardDescription>{t.researchHint}</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Link href="/collaborate/investigaciones" className={buttonClasses({ variant: "secondary", className: "w-full sm:w-auto" })}>
                {t.researchCta}
              </Link>
          </div>
        </Card>

        <Card className="border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Timer className="h-5 w-5 text-amber-300" aria-hidden />
              {t.studyRoomTitle}
            </CardTitle>
            <CardDescription>{t.studyRoomHint}</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Link href="/collaborate/sala-estudio" className={buttonClasses({ variant: "secondary", className: "w-full sm:w-auto" })}>
                {t.studyRoomCta}
              </Link>
          </div>
        </Card>

        <Card className="border-teal-400/20 bg-gradient-to-br from-teal-500/10 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Video className="h-5 w-5 text-teal-300" aria-hidden />
              {t.classroomTitle}
            </CardTitle>
            <CardDescription>{t.classroomHint}</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Link href="/collaborate/aula-virtual" className={buttonClasses({ variant: "secondary", className: "w-full sm:w-auto" })}>
                {t.classroomCta}
              </Link>
          </div>
        </Card>
      </div>

      {virtualSession ? (
        <Card className="border-teal-400/25 bg-gradient-to-br from-teal-500/10 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Video className="h-5 w-5 text-teal-300" aria-hidden />
              {t.todayVirtualSessionTitle}
            </CardTitle>
            <CardDescription>{t.todayVirtualSessionWhen(virtualSession.hoursUntil)}</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-6">
            <span className="font-medium text-white">{virtualSession.course}</span>
            <Link href={virtualSession.href} className={buttonClasses({ variant: "secondary", size: "sm" })}>
                {t.todayVirtualSessionCta}
              </Link>
          </div>
        </Card>
      ) : null}

      <Card className="border-white/10 bg-slate-950/40">
        <CardHeader>
          <CardTitle>{t.roadmapTitle}</CardTitle>
          <CardDescription>{t.roadmapHint}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
