"use client";

import { Flame, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { todayCopy } from "@/lib/i18n/today";
import { cn } from "@/lib/cn";
import { addDaysLocalIso, localIsoDate } from "@/lib/calendar/local-iso-date";
import type { PassModePlan } from "@/lib/pass-mode";
import { loadTodayMission } from "@/lib/storage/today-mission-storage";
import {
  getStudyStreakDays,
  last7DayActivity,
  loadStudyStreakState,
  studiedOnDate,
} from "@/lib/storage/study-streak-storage";
import { buildMotivationMessage } from "@/lib/today/motivation-message";
import { syncProfileStudyStreak } from "@/lib/today/sync-profile-streak";
import { useTodayContext } from "@/components/today/use-today-context";

type TodayMomentumPanelProps = {
  plan: PassModePlan;
  /** Bump when mission checklist changes */
  missionTick?: number;
};

const toneStyles = {
  celebrate: "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-amber-500/5 to-transparent",
  encourage: "border-purple-500/25 bg-gradient-to-br from-purple-500/10 to-transparent",
  nudge: "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent",
  calm: "border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-transparent",
} as const;

function weekdayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("es-ES", { weekday: "narrow" });
}

export function TodayMomentumPanel({ plan, missionTick = 0 }: TodayMomentumPanelProps) {
  const { profile, setProfile } = useKampus();
  const t = todayCopy.es;
  const prioritySubjects = useMemo(
    () => [...new Set(plan.sequence.map((b) => b.subject))],
    [plan.sequence],
  );
  const { alerts } = useTodayContext(prioritySubjects);
  const materialAlertCount = alerts.length;
  const [streakDays, setStreakDays] = useState(0);
  const [missionDone, setMissionDone] = useState(0);
  const [weekActivity, setWeekActivity] = useState<boolean[]>([]);

  useEffect(() => {
    const mission = loadTodayMission();
    const state = loadStudyStreakState();
    setMissionDone(mission.completedBlockIds.length);
    setStreakDays(getStudyStreakDays());
    setWeekActivity(last7DayActivity(state.activeDates));
    setProfile((prev) => syncProfileStudyStreak(prev));
  }, [missionTick, setProfile]);

  const missionTotal = plan.sequence.length;
  const studiedToday = studiedOnDate(localIsoDate());

  const message = useMemo(
    () =>
      buildMotivationMessage({
        profile,
        plan,
        streakDays,
        missionDone,
        missionTotal,
        studiedToday,
        materialAlertCount,
      }),
    [profile, plan, streakDays, missionDone, missionTotal, studiedToday, materialAlertCount],
  );

  const weekLabels = useMemo(() => {
    const today = localIsoDate();
    return Array.from({ length: 7 }, (_, i) => weekdayLabel(addDaysLocalIso(i - 6, new Date(`${today}T12:00:00`))));
  }, []);

  return (
    <Card className={cn(toneStyles[message.tone])}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          {message.tone === "celebrate" ? (
            <Sparkles className="h-5 w-5 text-emerald-300" aria-hidden />
          ) : (
            <Flame className="h-5 w-5 text-amber-300" aria-hidden />
          )}
          {t.momentumTitle}
          <Badge tone={streakDays >= 3 ? "success" : streakDays > 0 ? "warning" : "neutral"}>
            {streakDays} {t.streakDaysLabel}
          </Badge>
        </CardTitle>
        <CardDescription>{message.headline}</CardDescription>
      </CardHeader>

      <div className="space-y-4 px-6 pb-6">
        <p className="text-sm leading-relaxed text-slate-200">{message.body}</p>

        <div>
          <p className="mb-2 text-xs text-slate-400">{t.momentumWeekLabel}</p>
          <div className="flex items-end justify-between gap-1">
            {weekActivity.map((active, idx) => (
              <div key={idx} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={cn(
                    "h-8 w-full max-w-[2.25rem] rounded-lg border transition",
                    active
                      ? "border-emerald-400/40 bg-emerald-500/30"
                      : "border-white/10 bg-white/5",
                    idx === 6 && !active && streakDays > 0 ? "ring-1 ring-amber-400/40" : "",
                  )}
                  title={active ? t.momentumDayStudied : t.momentumDayRest}
                />
                <span className="text-[10px] uppercase text-slate-500">{weekLabels[idx]}</span>
              </div>
            ))}
          </div>
        </div>

        {message.ctaLabel && message.ctaHref ? (
          message.ctaHref.startsWith("#") ? (
            <a href={message.ctaHref}>
              <Button size="sm" variant="secondary">
                {message.ctaLabel}
              </Button>
            </a>
          ) : (
            <Link href={message.ctaHref}>
              <Button size="sm" variant="secondary">
                {message.ctaLabel}
              </Button>
            </Link>
          )
        ) : null}
      </div>
    </Card>
  );
}
