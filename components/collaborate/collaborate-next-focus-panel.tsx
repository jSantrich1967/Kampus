"use client";

import Link from "next/link";
import { CalendarClock, Microscope, Presentation } from "lucide-react";

import { useCollaborationNextFocus } from "@/hooks/use-collaboration-next-focus";
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

export function CollaborateNextFocusPanel() {
  const t = collaborateCopy.es;
  const { next, loading } = useCollaborationNextFocus();

  if (loading || !next) return null;

  const Icon = next.kind === "work" ? Microscope : Presentation;

  return (
    <Card className="border-amber-400/25 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarClock className="h-5 w-5 text-amber-300" aria-hidden />
          {t.nextFocusTitle}
        </CardTitle>
        <CardDescription>{t.nextFocusHint}</CardDescription>
      </CardHeader>

      <div className="flex flex-col gap-4 px-6 pb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" aria-hidden />
          <div>
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
              <Badge tone="neutral">
                {next.kind === "work" ? t.subnavResearch : t.subnavPresentations}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={next.href}>
            <Button size="sm">{t.nextFocusCta}</Button>
          </Link>
          <Link href="/exams/calendar">
            <Button size="sm" variant="secondary">
              {t.calendarCta}
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
