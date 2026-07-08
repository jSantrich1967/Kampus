"use client";

import { CheckCircle2, Play, Target } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { passModeCopy } from "@/lib/i18n/pass-mode";
import type { StudyBlock } from "@/lib/pass-mode";
import {
  getStudyBlockActionHref,
  getStudyBlockActionLabel,
} from "@/lib/today/block-action-href";

type PassModeNextBlockPanelProps = {
  block: StudyBlock | null;
  blockIndex: number;
  totalBlocks: number;
  doneCount: number;
  dayProgress: number;
  allDone: boolean;
  onMarkDone: (blockId: string) => void;
  isDone: boolean;
};

export function PassModeNextBlockPanel({
  block,
  blockIndex,
  totalBlocks,
  doneCount,
  dayProgress,
  allDone,
  onMarkDone,
  isDone,
}: PassModeNextBlockPanelProps) {
  const t = passModeCopy.es;

  if (!block && !allDone) return null;

  return (
    <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          {allDone ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden />
          ) : (
            <Target className="h-5 w-5 text-purple-300" aria-hidden />
          )}
          {allDone ? t.allDoneTitle : t.nextBlockTitle}
        </CardTitle>
        <CardDescription>{allDone ? t.allDoneHint : t.nextBlockHint}</CardDescription>
      </CardHeader>

      <div className="space-y-4 px-6 pb-6">
        {!allDone && block ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone="accent">
                Paso {blockIndex + 1} de {totalBlocks}
              </Badge>
              <Badge tone="neutral">{block.minutes} min</Badge>
              <Badge tone="warning">Siguiente</Badge>
            </div>
            <h3 className="text-lg font-semibold text-white">{block.title}</h3>
            <p className="mt-1 text-sm text-slate-300">
              {block.subject} · Enfoque: {block.focus}
            </p>
            <p className="mt-2 text-xs text-slate-400">{block.rationale}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={getStudyBlockActionHref(block)}>
                <Button className="gap-2">
                  <Play className="h-4 w-4" aria-hidden />
                  {getStudyBlockActionLabel(block)}
                </Button>
              </Link>
              {!isDone ? (
                <Button type="button" variant="secondary" onClick={() => onMarkDone(block.id)}>
                  {t.markDone}
                </Button>
              ) : null}
              <Link href="/today#today-mission">
                <Button type="button" variant="ghost">
                  {t.viewToday}
                </Button>
              </Link>
            </div>
          </div>
        ) : null}

        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-300">Progreso del día</span>
            <span className="font-medium text-white">{t.missionProgress(doneCount, totalBlocks, dayProgress)}</span>
          </div>
          <Progress value={dayProgress} />
        </div>
      </div>
    </Card>
  );
}
