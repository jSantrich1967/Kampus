"use client";

import Link from "next/link";
import { Activity } from "lucide-react";

import { useWellbeingRiskSignal } from "@/hooks/use-wellbeing-risk-signal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buildPsychologistHref } from "@/lib/wellbeing/psychologist-path";
import type { WellbeingRiskLevel } from "@/lib/wellbeing/wellbeing-risk-bridge";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

function levelTone(level: WellbeingRiskLevel) {
  if (level === "elevated") return "danger" as const;
  if (level === "watch") return "warning" as const;
  return "success" as const;
}

function levelLabel(level: WellbeingRiskLevel, t: typeof wellbeingCopy.es) {
  if (level === "elevated") return t.riskLevelElevated;
  if (level === "watch") return t.riskLevelWatch;
  return t.riskLevelOk;
}

type Props = {
  /** Shown on academic radar — links back to wellbeing */
  variant?: "radar" | "insights";
};

export function WellbeingRadarBridgePanel({ variant = "insights" }: Props) {
  const t = wellbeingCopy.es;
  const { signal, loading } = useWellbeingRiskSignal();

  if (loading || !signal.showOnRadar) return null;

  return (
    <Card
      className={
        variant === "radar"
          ? "border-violet-400/25 bg-gradient-to-br from-violet-500/10 to-transparent"
          : "border-amber-400/25 bg-gradient-to-br from-amber-500/10 to-transparent"
      }
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-violet-300" aria-hidden />
            {variant === "radar" ? t.riskBridgeRadarTitle : t.riskBridgeInsightsTitle}
          </CardTitle>
          <Badge tone={levelTone(signal.level)}>{levelLabel(signal.level, t)}</Badge>
        </div>
        <CardDescription>{t.riskBridgeHint}</CardDescription>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6">
        <Progress value={signal.score} />
        <ul className="space-y-2 text-sm text-slate-300">
          {signal.reasons.map((reason) => (
            <li key={reason} className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2">
              {reason}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Link href={buildPsychologistHref()}>
            <Button size="sm" variant="secondary">
              {t.insightsTalkCta}
            </Button>
          </Link>
          {variant === "radar" ? (
            <Link href="/wellbeing">
              <Button size="sm" variant="ghost">
                {t.riskBridgeWellbeingCta}
              </Button>
            </Link>
          ) : (
            <Link href="/risk">
              <Button size="sm" variant="ghost">
                {t.riskBridgeRadarCta}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
