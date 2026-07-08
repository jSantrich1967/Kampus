"use client";

import { Activity, Radio } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatBlock } from "@/components/ui/stat-block";
import { useVirtualClassParticipation } from "@/hooks/use-virtual-class-participation";
import { collaborateCopy } from "@/lib/i18n/collaborate";

type Props = {
  sessionId: string;
  isCreator: boolean;
  sessionLoaded: boolean;
};

export function VirtualClassParticipationPanel({ sessionId, isCreator, sessionLoaded }: Props) {
  const t = collaborateCopy.es;
  const { live, realtime } = useVirtualClassParticipation(sessionId, sessionLoaded, isCreator);

  if (!isCreator) return null;

  return (
    <Card className="border-emerald-400/20 bg-emerald-500/5">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-emerald-300" aria-hidden />
            {t.participationTitle}
          </CardTitle>
          {realtime ? (
            <Badge tone="accent" className="gap-1 text-[10px]">
              <Radio className="h-3 w-3" aria-hidden />
              {t.participationRealtime}
            </Badge>
          ) : null}
        </div>
        <CardDescription>{t.participationHint}</CardDescription>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6">
        {live ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatBlock label={t.participationActiveNow} value={live.activeNow} hint={t.participationActiveHint} />
              <StatBlock
                label={t.participationTotal}
                value={live.totalParticipants}
                hint={t.participationTotalHint}
              />
            </div>
            {live.participants.length > 0 ? (
              <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3">
                {live.participants.map((p) => (
                  <li key={p.userId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-slate-200">{p.displayName}</span>
                    <span className="text-[11px] text-slate-500">
                      {p.activeNow ? t.participationStatusActive : t.participationStatusIdle}
                      {" · "}
                      {t.participationHeartbeats(p.heartbeatCount)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">{t.participationEmpty}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-400">{t.participationLoading}</p>
        )}
      </div>
    </Card>
  );
}
