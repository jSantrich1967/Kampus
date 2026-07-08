"use client";

import Link from "next/link";
import { Activity, TrendingDown, TrendingUp, Minus } from "lucide-react";

import { useDiaryInsights } from "@/hooks/use-diary-insights";
import { useDiaryCheckInStatus } from "@/hooks/use-diary-check-in-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatBlock } from "@/components/ui/stat-block";
import { moodEmoji } from "@/lib/wellbeing/diary-insights";
import { buildPsychologistHref } from "@/lib/wellbeing/psychologist-path";
import { WellbeingRadarBridgePanel } from "@/components/wellbeing/wellbeing-radar-bridge-panel";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

function trendLabel(trend: "up" | "down" | "stable" | null, t: typeof wellbeingCopy.es) {
  if (trend === "up") return t.insightsTrendUp;
  if (trend === "down") return t.insightsTrendDown;
  if (trend === "stable") return t.insightsTrendStable;
  return t.insightsTrendUnknown;
}

function weekCompareLabel(trend: "better" | "worse" | "same" | null, t: typeof wellbeingCopy.es) {
  if (trend === "better") return t.insightsWeekCompareBetter;
  if (trend === "worse") return t.insightsWeekCompareWorse;
  if (trend === "same") return t.insightsWeekCompareSame;
  return t.insightsWeekCompareUnknown;
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" | null }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-emerald-300" aria-hidden />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-rose-300" aria-hidden />;
  return <Minus className="h-4 w-4 text-slate-400" aria-hidden />;
}

export function WellbeingInsightsPanel() {
  const t = wellbeingCopy.es;
  const { insights, loading } = useDiaryInsights();
  const { streakDays } = useDiaryCheckInStatus();

  if (loading) return null;
  if (insights.entriesLast7Days === 0 && streakDays === 0) return null;

  const showLowMoodBanner = insights.lowMoodDays7d >= 2 || insights.stressTagCount7d >= 2;

  return (
    <div className="space-y-4">
      {showLowMoodBanner ? (
        <Card className="border-rose-400/25 bg-gradient-to-br from-rose-500/10 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t.insightsLowMoodTitle}</CardTitle>
            <CardDescription>{t.insightsLowMoodHint}</CardDescription>
          </CardHeader>
          <div className="px-6 pb-4">
            <Link href={buildPsychologistHref()}>
              <Button size="sm" variant="secondary">
                {t.insightsTalkCta}
              </Button>
            </Link>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBlock
          label={t.insightsEntries7d}
          value={insights.entriesLast7Days}
          hint={t.insightsEntries7dHint}
        />
        <StatBlock
          label={t.insightsStreak}
          value={streakDays}
          hint={t.streakLabel(streakDays)}
        />
        <StatBlock
          label={t.insightsEnergy7d}
          value={insights.averageEnergy7d ?? "—"}
          hint={insights.averageEnergy7d !== null ? t.insightsEnergyScale : t.insightsNotEnoughData}
        />
        <Card className="border-white/10 bg-slate-950/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Activity className="h-4 w-4 text-violet-300" aria-hidden />
              {t.insightsMoodTrend}
            </CardTitle>
          </CardHeader>
          <div className="flex items-center gap-2 px-6 pb-5">
            <TrendIcon trend={insights.moodTrend} />
            <span className="text-lg font-semibold text-white">{trendLabel(insights.moodTrend, t)}</span>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatBlock
          label={t.insightsEntries14d}
          value={insights.entriesLast14Days}
          hint={weekCompareLabel(insights.weekCompareEnergy, t)}
        />
        <StatBlock
          label={t.insightsEnergy14d}
          value={insights.averageEnergy14d ?? "—"}
          hint={insights.averageEnergy14d !== null ? t.insightsEnergyScale14d : t.insightsNotEnoughData}
        />
      </div>

      {insights.todayMood ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
          <span>{t.insightsTodayCheckIn}</span>
          <Badge tone="accent">
            {moodEmoji(insights.todayMood)} {insights.todayEnergy ?? "?"}/5
          </Badge>
        </div>
      ) : null}

      <WellbeingRadarBridgePanel variant="insights" />
    </div>
  );
}
