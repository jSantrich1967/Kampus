"use client";

import { Check, Circle, Play, Target } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { PassModePlan, StudyBlock } from "@/lib/pass-mode";
import { cn } from "@/lib/cn";
import { loadTodayMission, toggleTodayBlock } from "@/lib/storage/today-mission-storage";
import { recordStudyActivity } from "@/lib/storage/study-streak-storage";
import { getStudyBlockActionHref, getStudyBlockActionLabel } from "@/lib/today/block-action-href";
import { syncProfileStudyStreak } from "@/lib/today/sync-profile-streak";

type TodayMissionPanelProps = {
  plan: PassModePlan;
  onProgressChange?: () => void;
};

export function TodayMissionPanel({ plan, onProgressChange }: TodayMissionPanelProps) {
  const { setProfile } = useKampus();
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const mission = loadTodayMission();
    setCompletedIds(mission.completedBlockIds);
    if (mission.completedBlockIds.length > 0) {
      recordStudyActivity();
      setProfile((prev) => syncProfileStudyStreak(prev));
    }
    setHydrated(true);
  }, [setProfile]);

  const bumpStudyProgress = useCallback(() => {
    recordStudyActivity();
    setProfile((prev) => syncProfileStudyStreak(prev));
    onProgressChange?.();
  }, [setProfile, onProgressChange]);

  const blocks = plan.sequence;
  const completedSet = useMemo(() => new Set(completedIds), [completedIds]);

  const firstOpen = useMemo(
    () => blocks.find((b) => !completedSet.has(b.id)) ?? blocks[0],
    [blocks, completedSet],
  );

  const doneCount = blocks.filter((b) => completedSet.has(b.id)).length;
  const dayProgress = blocks.length ? Math.round((doneCount / blocks.length) * 100) : 0;
  const allDone = doneCount === blocks.length && blocks.length > 0;

  const toggleBlock = useCallback((blockId: string) => {
    const done = !completedSet.has(blockId);
    const next = toggleTodayBlock(blockId, done);
    setCompletedIds(next.completedBlockIds);
    if (done) bumpStudyProgress();
    else onProgressChange?.();
  }, [completedSet, bumpStudyProgress, onProgressChange]);

  if (!hydrated || !firstOpen) return null;

  return (
    <Card
      id="today-mission"
      className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent scroll-mt-24"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Target className="h-5 w-5 text-purple-300" aria-hidden />
          Tu misión de hoy
        </CardTitle>
        <CardDescription>
          {allDone
            ? "Misión completada. Repasa o descansa — mañana Kampus recalibra."
            : "Un solo paso claro: empieza por el primero y táchalos en orden."}
        </CardDescription>
      </CardHeader>

      <div className="space-y-5 px-6 pb-6">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-300">Progreso del día</span>
            <span className="font-medium text-white">
              {doneCount}/{blocks.length} bloques · {dayProgress}%
            </span>
          </div>
          <Progress value={dayProgress} />
        </div>

        {allDone ? (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-5 py-4">
            <p className="text-sm font-medium text-emerald-100">Completaste el plan de hoy 🎉</p>
            <p className="mt-1 text-sm text-slate-300">
              Bien hecho. Mañana Kampus recalibra tu misión.
            </p>
          </div>
        ) : null}

        <ol className="space-y-2">
          {blocks.map((block, idx) =>
            !allDone && block.id === firstOpen.id ? (
              <MissionNextStep
                key={block.id}
                block={block}
                index={idx}
                total={blocks.length}
                onToggle={() => toggleBlock(block.id)}
              />
            ) : (
              <MissionChecklistRow
                key={block.id}
                block={block}
                index={idx}
                done={completedSet.has(block.id)}
                onToggle={() => toggleBlock(block.id)}
              />
            ),
          )}
        </ol>

        <div className="flex justify-end">
          <Link href="/pass-mode">
            <Button type="button" variant="ghost" size="sm">
              Ver plan completo
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

function MissionNextStep({
  block,
  index,
  total,
  onToggle,
}: {
  block: StudyBlock;
  index: number;
  total: number;
  onToggle: () => void;
}) {
  return (
    <li
      aria-current="step"
      className="rounded-2xl border border-purple-400/30 bg-purple-500/10 p-5"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="accent">
          Paso {index + 1} de {total}
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
        <Button type="button" variant="secondary" onClick={onToggle}>
          Marcar como hecho
        </Button>
      </div>
    </li>
  );
}

function MissionChecklistRow({
  block,
  index,
  done,
  onToggle,
}: {
  block: StudyBlock;
  index: number;
  done: boolean;
  onToggle: () => void;
}) {
  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        done ? "border-emerald-500/25 bg-emerald-500/5" : "border-white/10 bg-white/5",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition",
            done
              ? "border-emerald-400 bg-emerald-500/30 text-emerald-100"
              : "border-white/20 bg-white/5 text-slate-400 hover:border-purple-400/50",
          )}
          aria-label={done ? `Desmarcar bloque ${block.title}` : `Marcar bloque ${block.title} como hecho`}
        >
          {done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
        </button>
        <div className="min-w-0">
          <p className={cn("text-sm font-medium", done ? "text-emerald-100 line-through opacity-80" : "text-white")}>
            {index + 1}. {block.title}
          </p>
          <p className="text-xs text-slate-400">
            {block.subject} · {block.minutes} min · {block.focus}
          </p>
        </div>
      </div>
      <Link href={getStudyBlockActionHref(block)} className="shrink-0 sm:ml-2">
        <Button size="sm" variant={done ? "ghost" : "secondary"}>
          {done ? "Repasar" : "Empezar"}
        </Button>
      </Link>
    </li>
  );
}
