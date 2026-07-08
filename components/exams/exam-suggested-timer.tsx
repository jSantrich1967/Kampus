"use client";

import { Clock, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { examsCopy } from "@/lib/i18n/exams";
import {
  formatTimerClock,
  parseSuggestedTimerRange,
  timerProgressPct,
} from "@/lib/exams/suggested-timer";

type ExamSuggestedTimerProps = {
  description: string;
  questionCount: number;
};

export function ExamSuggestedTimer({ description, questionCount }: ExamSuggestedTimerProps) {
  const t = examsCopy.es;
  const { min, max } = parseSuggestedTimerRange(description, questionCount);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const progress = timerProgressPct(elapsed, max);
  const overSuggested = elapsed > max * 60;

  function reset() {
    setRunning(false);
    setElapsed(0);
  }

  return (
    <Card className="border-sky-400/20 bg-sky-500/[0.06]">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-sky-300" aria-hidden />
          {t.timerTitle}
        </CardTitle>
        <CardDescription>
          {t.timerSuggested(min, max)}
          {t.timerHint}
        </CardDescription>
      </CardHeader>

      <div className="space-y-4 px-6 pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-3xl font-semibold tabular-nums text-white">{formatTimerClock(elapsed)}</span>
          {overSuggested ? <Badge tone="warning">{t.timerOverSuggested}</Badge> : null}
        </div>

        <Progress value={progress} className="h-2" />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="gap-2"
            onClick={() => setRunning((r) => !r)}
          >
            {running ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
            {running ? t.timerPause : t.timerStart}
          </Button>
          <Button type="button" size="sm" variant="ghost" className="gap-2" onClick={reset}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            {t.timerReset}
          </Button>
        </div>
      </div>
    </Card>
  );
}
