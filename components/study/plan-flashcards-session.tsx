"use client";

import { ArrowLeft, CheckCircle2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { usePassModePlan } from "@/lib/hooks/use-pass-mode-plan";
import { passModeCopy } from "@/lib/i18n/pass-mode";
import { buildPlanFlashcards, buildDemoFlashcards } from "@/lib/study/plan-flashcards";
import { completeTodayBlock, loadTodayMission } from "@/lib/storage/today-mission-storage";
import { recordStudyActivity } from "@/lib/storage/study-streak-storage";
import { getFirstOpenBlock, getStudyBlockActionHref, getStudyBlockActionLabel } from "@/lib/today/block-action-href";
import { syncProfileStudyStreak } from "@/lib/today/sync-profile-streak";
import { cn } from "@/lib/cn";

function parseMinutes(raw: string | null, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 3) return fallback;
  return Math.min(20, Math.round(n));
}

export function PlanFlashcardsSession() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, setProfile } = useKampus();
  const { plan } = usePassModePlan();
  const t = passModeCopy.es;

  const subjectParam = searchParams.get("subject")?.trim();
  const isDemo = searchParams.get("demo") === "1";
  const fromHub = searchParams.get("from") === "hub";
  const flashBlock = plan.sequence.find((b) => b.id === "flashcards");
  const subject = subjectParam || flashBlock?.subject || profile.subjects[0] || "General";
  const minutes = parseMinutes(searchParams.get("minutes"), flashBlock?.minutes ?? 12);

  const cards = useMemo(
    () => (isDemo ? buildDemoFlashcards() : buildPlanFlashcards(profile, plan)),
    [isDemo, profile, plan],
  );

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [finished, setFinished] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);

  useEffect(() => {
    setSecondsLeft(minutes * 60);
  }, [minutes]);

  useEffect(() => {
    if (finished) return;
    if (secondsLeft <= 0) {
      setFinished(true);
      return;
    }
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [finished, secondsLeft]);

  const finishSession = useCallback(() => {
    setFinished(true);
    if (!isDemo) {
      completeTodayBlock("flashcards");
      recordStudyActivity();
      setProfile((prev) => syncProfileStudyStreak(prev));
    }
  }, [isDemo, setProfile]);

  const current = cards[index];
  const progress = cards.length ? Math.round(((index + (finished ? 1 : 0)) / cards.length) * 100) : 0;

  const nextBlock = useMemo(() => {
    if (!finished) return null;
    const mission = loadTodayMission();
    const next = getFirstOpenBlock(plan, mission.completedBlockIds);
    return next?.id === "flashcards" ? null : next;
  }, [finished, plan]);

  const timerLabel = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  function markKnown() {
    setKnown((k) => k + 1);
    goNext();
  }

  function goNext() {
    setFlipped(false);
    if (index >= cards.length - 1) {
      finishSession();
      return;
    }
    setIndex((i) => i + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.flashcardsTitle}
        description={t.flashcardsHint(subject, minutes)}
        actions={
          <Link href={fromHub ? "/study/flashcards" : "/pass-mode"}>
            <Button variant="secondary" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {fromHub ? "Volver a Tarjetas" : t.backToPassMode}
            </Button>
          </Link>
        }
      />

      {!finished && current ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">
                  {subject} · {index + 1}/{cards.length}
                </CardTitle>
                <CardDescription>{t.flashcardsFocus(flashBlock?.focus ?? "")}</CardDescription>
              </div>
              <span className="font-mono text-sm text-purple-200">{timerLabel}</span>
            </div>
            <Progress value={progress} className="mt-3" />
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <button
              type="button"
              className={cn(
                "flex min-h-[180px] w-full flex-col items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 p-6 text-center transition",
                flipped && "border-purple-400/30 bg-purple-500/10",
              )}
              onClick={() => setFlipped((f) => !f)}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {flipped ? t.flashcardsBack : t.flashcardsFront}
              </p>
              <p className="mt-3 text-lg font-medium text-white">
                {flipped ? current.back : current.front}
              </p>
            </button>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setFlipped((f) => !f)}>
                {flipped ? t.flashcardsHide : t.flashcardsReveal}
              </Button>
              <Button type="button" onClick={markKnown}>
                {t.flashcardsKnown}
              </Button>
              <Button type="button" variant="ghost" onClick={goNext}>
                {t.flashcardsReview}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border-emerald-500/25 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden />
              {t.flashcardsDoneTitle}
            </CardTitle>
            <CardDescription>
              {t.flashcardsDoneBody(cards.length, known)}
            </CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-2 px-6 pb-6">
            {nextBlock && nextBlock.id !== "flashcards" ? (
              <Link href={getStudyBlockActionHref(nextBlock)}>
                <Button>{t.quizDoneNext}: {getStudyBlockActionLabel(nextBlock)}</Button>
              </Link>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => router.push(fromHub ? "/study/flashcards" : "/pass-mode")}>
              {fromHub ? "Volver a Tarjetas" : t.backToPassMode}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="gap-2"
              onClick={() => {
                setIndex(0);
                setFlipped(false);
                setKnown(0);
                setFinished(false);
                setSecondsLeft(minutes * 60);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              {t.flashcardsRepeat}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
