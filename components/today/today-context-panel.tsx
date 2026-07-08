"use client";

import { AlertTriangle, BookOpen, CalendarDays, Clock, MapPin, Upload } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTodayContext } from "@/components/today/use-today-context";
import { todayCopy } from "@/lib/i18n/today";
import { cn } from "@/lib/cn";
import type { TodayClassSlot } from "@/lib/today/today-classes";
import type { NotebookHealthAlert } from "@/lib/today/notebook-health";

type TodayContextPanelProps = {
  prioritySubjects?: string[];
};

export function TodayContextPanel({ prioritySubjects = [] }: TodayContextPanelProps) {
  const t = todayCopy.es;
  const { loading, todayClasses, alerts, hasSchedule } = useTodayContext(prioritySubjects);

  const showClasses = todayClasses.length > 0;
  const showAlerts = alerts.length > 0;
  const showEmptySchedule = !hasSchedule && !loading;

  if (!showClasses && !showAlerts && !showEmptySchedule) return null;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-sky-300" aria-hidden />
            {t.classTodayTitle}
          </CardTitle>
          <CardDescription>{t.classTodayHint}</CardDescription>
        </CardHeader>

        <div className="space-y-3 px-6 pb-6">
          {loading && todayClasses.length === 0 ? (
            <p className="text-sm text-slate-400">{t.classTodayLoading}</p>
          ) : null}

          {showClasses ? (
            todayClasses.map((slot) => <TodayClassRow key={`${slot.id}-${slot.classDate}`} slot={slot} t={t} />)
          ) : showEmptySchedule ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-sm text-slate-300">{t.noClassSchedule}</p>
              <Link href="/exams/calendar" className="mt-3 inline-block">
                <Button size="sm" variant="secondary">
                  {t.addClassScheduleCta}
                </Button>
              </Link>
            </div>
          ) : (
            <p className="text-sm text-slate-400">{t.noClassesToday}</p>
          )}
        </div>
      </Card>

      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-amber-300" aria-hidden />
            {t.materialAlertsTitle}
          </CardTitle>
          <CardDescription>{t.materialAlertsHint}</CardDescription>
        </CardHeader>

        <div className="space-y-3 px-6 pb-6">
          {showAlerts ? (
            alerts.map((alert) => <MaterialAlertRow key={alert.id} alert={alert} />)
          ) : (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4">
              <p className="text-sm text-emerald-100">{t.materialAllGood}</p>
              <Link href="/study/library" className="mt-3 inline-block">
                <Button size="sm" variant="ghost">
                  {t.openNotebooksCta}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function statusBadge(slot: TodayClassSlot, t: (typeof todayCopy)["es"]) {
  if (slot.status === "now") return { tone: "accent" as const, label: t.classStatusNow };
  if (slot.status === "past") return { tone: "neutral" as const, label: t.classStatusPast };
  return { tone: "warning" as const, label: t.classStatusUpcoming };
}

function TodayClassRow({ slot, t }: { slot: TodayClassSlot; t: (typeof todayCopy)["es"] }) {
  const badge = statusBadge(slot, t);

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-white">{slot.subject}</span>
            <Badge tone={badge.tone}>{badge.label}</Badge>
            {slot.hasNotesForToday ? (
              <Badge tone="success">{t.classNotesReady}</Badge>
            ) : (
              <Badge tone="warning">{t.classNotesMissing}</Badge>
            )}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {slot.startTime}–{slot.endTime}
            </span>
            {slot.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {slot.location}
              </span>
            ) : null}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {slot.hasNotesForToday ? (
          <Link href={slot.reviewHref}>
            <Button size="sm" variant="secondary" className="gap-1.5">
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              {t.reviewClassNotesCta}
            </Button>
          </Link>
        ) : (
          <Link href={slot.uploadHref}>
            <Button size="sm" variant="secondary" className="gap-1.5">
              <Upload className="h-3.5 w-3.5" aria-hidden />
              {slot.status === "past" ? t.uploadAfterClassCta : t.prepareNotebookCta}
            </Button>
          </Link>
        )}
        <Link href="/exams/calendar">
          <Button size="sm" variant="ghost">
            {t.openCalendarCta}
          </Button>
        </Link>
      </div>
    </div>
  );
}

function MaterialAlertRow({ alert }: { alert: NotebookHealthAlert }) {
  const toneClass =
    alert.kind === "empty"
      ? "border-amber-400/25 bg-amber-400/5"
      : alert.kind === "class_missing_notes"
        ? "border-orange-400/25 bg-orange-400/5"
        : "border-yellow-400/20 bg-yellow-400/5";

  return (
    <div className={cn("rounded-xl border px-4 py-3", toneClass)}>
      <p className="text-sm font-medium text-white">{alert.title}</p>
      <p className="mt-1 text-xs text-slate-300">{alert.description}</p>
      <Link href={alert.href} className="mt-2 inline-block">
        <Button size="sm" variant="ghost">
          {alert.kind === "empty"
            ? "Subir apuntes"
            : alert.kind === "unlinked"
              ? "Ir al calendario"
              : "Preparar material"}
        </Button>
      </Link>
    </div>
  );
}
