"use client";

import { ArrowLeft, BookOpen, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { useTodayContext } from "@/components/today/use-today-context";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { RescueQuizItem } from "@/lib/class-rescue";
import { cn } from "@/lib/cn";
import { usePassModePlan } from "@/lib/hooks/use-pass-mode-plan";
import { passModeCopy } from "@/lib/i18n/pass-mode";
import { pressureQuizCopy } from "@/lib/i18n/pressure-quiz";
import { subjectToPathSegment } from "@/lib/notebooks/paths";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import { completeTodayBlock, loadTodayMission } from "@/lib/storage/today-mission-storage";
import { recordStudyActivity } from "@/lib/storage/study-streak-storage";
import {
  getFirstOpenBlock,
  getStudyBlockActionHref,
  getStudyBlockActionLabel,
} from "@/lib/today/block-action-href";
import { syncProfileStudyStreak } from "@/lib/today/sync-profile-streak";
import { generatePressureQuizQuestions } from "@/lib/study/generate-pressure-quiz";
import {
  buildNotebookReviewHref,
  buildPressureQuizPath,
  filterDocsForSubject,
  getPressureQuizBlock,
  listUniqueClassLabels,
} from "@/lib/study/pressure-quiz";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Phase = "loading" | "ready" | "running" | "finished";

function QuestionSourceBadge({
  question,
  subject,
  openKit = false,
}: {
  question: RescueQuizItem;
  subject: string;
  openKit?: boolean;
}) {
  if (!question.sourceClassLabel) return null;
  const reviewHref = buildNotebookReviewHref(subject, question.sourceDocumentId, { openKit });
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-xs text-purple-100 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <BookOpen className="h-3.5 w-3.5 shrink-0 text-purple-300" aria-hidden />
        <span>
          Basada en: <strong className="font-semibold text-white">{question.sourceClassLabel}</strong>
          {question.sourceFilename ? (
            <span className="text-slate-400"> · {question.sourceFilename}</span>
          ) : null}
        </span>
      </div>
      <Link
        href={reviewHref}
        className="shrink-0 font-semibold text-purple-200 underline-offset-2 hover:text-white hover:underline"
      >
        Ver apunte
      </Link>
    </div>
  );
}

function parseMinutes(raw: string | null, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 3) return fallback;
  return Math.min(45, Math.round(n));
}

export function PressureControlQuiz() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, authUserId, setProfile } = useKampus();
  const tPass = passModeCopy.es;
  const t = pressureQuizCopy.es;

  const { plan } = usePassModePlan();
  const quizBlock = getPressureQuizBlock(plan);

  const subjectParam = searchParams.get("subject")?.trim();
  const subject = subjectParam || quizBlock?.subject || profile.subjects[0] || "General";
  const minutes = parseMinutes(searchParams.get("minutes"), quizBlock?.minutes ?? 12);
  const subjectSlug = subjectToPathSegment(subject);
  const { alerts } = useTodayContext([subject]);

  const subjectAlerts = useMemo(
    () => alerts.filter((a) => a.subject.toLowerCase() === subject.toLowerCase()),
    [alerts, subject],
  );

  const [phase, setPhase] = useState<Phase>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [packWarning, setPackWarning] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [isDemoSource, setIsDemoSource] = useState(false);
  const [questions, setQuestions] = useState<RescueQuizItem[]>([]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);

  const loadQuiz = useCallback(async () => {
    setPhase("loading");
    setLoadError(null);
    setPackWarning(null);

    let docs: NotebookDocumentRow[] = [];
    if (isSupabaseConfigured() && authUserId) {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("notebook_documents")
          .select("*")
          .eq("user_id", authUserId)
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        docs = filterDocsForSubject((data as NotebookDocumentRow[]) ?? [], subject);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "No se pudieron cargar los apuntes.";
        setLoadError(msg);
        setPhase("ready");
        return;
      }
    }

    const subjectDocs = docs;
    const result = await generatePressureQuizQuestions(subject, subjectDocs, profile);
    setSourceLabel(result.sourceLabel);
    setIsDemoSource(result.isDemoSource);
    if (result.packWarning) setPackWarning(result.packWarning);

    const qs = result.questions;
    if (qs.length === 0) {
      setLoadError("No se generaron preguntas. Sube apuntes al cuaderno e inténtalo de nuevo.");
      setPhase("ready");
      return;
    }

    setQuestions(qs);
    setAnswers(new Array(qs.length).fill(null));
    setCurrentIdx(0);
    setSelected(null);
    setRevealed(false);
    setSecondsLeft(minutes * 60);
    setPhase("ready");
  }, [authUserId, minutes, profile, subject]);

  useEffect(() => {
    void loadQuiz();
  }, [loadQuiz]);

  useEffect(() => {
    if (phase !== "running") return;
    if (secondsLeft <= 0) {
      setPhase("finished");
      return;
    }
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [phase, secondsLeft]);

  const current = questions[currentIdx];
  const score = useMemo(() => {
    let correct = 0;
    answers.forEach((a, i) => {
      if (a !== null && a === questions[i]?.answerIndex) correct += 1;
    });
    return correct;
  }, [answers, questions]);

  const timerLabel = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  const classLabels = useMemo(() => listUniqueClassLabels(questions), [questions]);

  const scoreByClass = useMemo(() => {
    const map = new Map<string, { correct: number; total: number }>();
    questions.forEach((q, i) => {
      const label = q.sourceClassLabel ?? "Sin clase";
      const entry = map.get(label) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (answers[i] === q.answerIndex) entry.correct += 1;
      map.set(label, entry);
    });
    return [...map.entries()];
  }, [answers, questions]);

  const missedQuestions = useMemo(() => {
    return questions
      .map((q, i) => ({ q, i }))
      .filter(({ q, i }) => answers[i] !== null && answers[i] !== q.answerIndex);
  }, [answers, questions]);

  const [quizMissionMarked, setQuizMissionMarked] = useState(false);

  useEffect(() => {
    if (phase !== "finished" || quizMissionMarked) return;
    completeTodayBlock("quiz");
    recordStudyActivity();
    setProfile((prev) => syncProfileStudyStreak(prev));
    setQuizMissionMarked(true);
  }, [phase, quizMissionMarked, setProfile]);

  const nextBlockAfterQuiz = useMemo(() => {
    if (phase !== "finished") return null;
    const mission = loadTodayMission();
    const next = getFirstOpenBlock(plan, mission.completedBlockIds);
    return next?.id === "quiz" ? null : next;
  }, [plan, phase, quizMissionMarked]);

  function startQuiz() {
    setPhase("running");
    setSecondsLeft(minutes * 60);
  }

  function confirmAnswer() {
    if (selected === null || !current) return;
    const next = [...answers];
    next[currentIdx] = selected;
    setAnswers(next);
    setRevealed(true);
  }

  function goNext() {
    if (currentIdx + 1 >= questions.length) {
      setPhase("finished");
      return;
    }
    setCurrentIdx((i) => i + 1);
    setSelected(null);
    setRevealed(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description(subject, minutes)}
        actions={
          <Link href="/pass-mode">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t.backToPlan}
            </Button>
          </Link>
        }
      />

      <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-sm text-purple-100">
        {t.missionBanner(plan.planLabel)}
      </div>

      {(subjectAlerts.length > 0 || isDemoSource) && phase !== "finished" && phase !== "loading" ? (
        <Card className="border-amber-500/25 bg-amber-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-100">{t.materialWarning}</CardTitle>
          </CardHeader>
          <div className="flex flex-wrap gap-2 px-6 pb-4">
            {subjectAlerts[0] ? (
              <Link href={subjectAlerts[0].href}>
                <Button size="sm">{t.uploadMaterialCta}</Button>
              </Link>
            ) : (
              <Link href={`/study/notebook/${subjectSlug}?upload=1`}>
                <Button size="sm">{t.uploadMaterialCta}</Button>
              </Link>
            )}
            <Link href={`/study/notebook/${subjectSlug}`}>
              <Button size="sm" variant="secondary">
                {t.openNotebook}
              </Button>
            </Link>
          </div>
        </Card>
      ) : null}

      {phase === "loading" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
              {t.loadingTitle}
            </CardTitle>
            <CardDescription>{t.loadingHint(subject)}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {loadError ? (
        <Card className="border-rose-500/30 bg-rose-500/10">
          <CardHeader>
            <CardTitle className="text-base text-rose-100">{t.errorTitle}</CardTitle>
            <CardDescription className="text-rose-200/80">{loadError}</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-2 px-6 pb-6">
            <Button type="button" onClick={() => void loadQuiz()}>
              {t.retry}
            </Button>
            <Link href={`/study/notebook/${subjectSlug}`}>
              <Button variant="secondary">{t.openNotebook}</Button>
            </Link>
          </div>
        </Card>
      ) : null}

      {phase === "ready" && !loadError && questions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t.readyTitle}</CardTitle>
            <CardDescription>
              {t.readySource(sourceLabel)}
              {isDemoSource ? (
                <span className="mt-2 block text-amber-200/90">{t.demoSourceWarning}</span>
              ) : null}
            </CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            {packWarning ? <p className="text-xs text-amber-200/90">{packWarning}</p> : null}
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
              {t.readyRules(questions.length, minutes).map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            {classLabels.length > 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t.classesTitle}
                </p>
                <ul className="space-y-1 text-sm text-slate-200">
                  {classLabels.map((label) => (
                    <li key={label} className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 text-purple-300" aria-hidden />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={startQuiz}>
                {t.startQuiz}
              </Button>
              <Link href={`/study/notebook/${subjectSlug}`}>
                <Button variant="secondary">{t.viewNotes}</Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : null}

      {phase === "running" && current ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">
                {t.questionProgress(currentIdx + 1, questions.length)}
              </CardTitle>
              <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-sm font-mono text-purple-200">
                <Clock className="h-4 w-4" />
                {timerLabel}
              </div>
            </div>
            <Progress value={((currentIdx + (revealed ? 1 : 0)) / questions.length) * 100} />
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <QuestionSourceBadge question={current} subject={subject} />
            <p className="text-lg font-medium text-white">{current.question}</p>
            <div className="space-y-2">
              {current.options.map((opt, i) => {
                const isCorrect = i === current.answerIndex;
                const isSelected = selected === i;
                let tone = "border-white/10 bg-white/5 hover:bg-white/10";
                if (revealed && isCorrect) tone = "border-emerald-400/50 bg-emerald-500/15";
                else if (revealed && isSelected && !isCorrect) tone = "border-rose-400/50 bg-rose-500/15";
                else if (!revealed && isSelected) tone = "border-purple-400/50 bg-purple-500/20";

                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={revealed}
                    className={cn("flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition", tone)}
                    onClick={() => setSelected(i)}
                  >
                    <span className="mt-0.5 font-semibold text-slate-400">{String.fromCharCode(65 + i)}.</span>
                    <span className="text-slate-100">{opt}</span>
                  </button>
                );
              })}
            </div>
            {!revealed ? (
              <Button type="button" disabled={selected === null} onClick={confirmAnswer}>
                {t.confirmAnswer}
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                {selected === current.answerIndex ? (
                  <span className="flex items-center gap-1 text-sm text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" /> {t.correct}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-rose-300">
                    <XCircle className="h-4 w-4" /> {t.incorrect}
                  </span>
                )}
                {revealed && selected !== current.answerIndex ? (
                  <Link href={buildNotebookReviewHref(subject, current.sourceDocumentId, { openKit: true })}>
                    <Button variant="secondary" size="sm">
                      {t.reviewClass}
                    </Button>
                  </Link>
                ) : null}
                <Button type="button" onClick={goNext}>
                  {currentIdx + 1 >= questions.length ? t.seeResults : t.nextQuestion}
                </Button>
              </div>
            )}
          </div>
        </Card>
      ) : null}

      {phase === "finished" && questions.length > 0 ? (
        <Card className="border-purple-500/25 bg-purple-500/5">
          <CardHeader>
            <CardTitle>{t.resultsTitle}</CardTitle>
            <CardDescription>
              {score} de {questions.length} correctas · {subject}
            </CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <div className="text-4xl font-bold text-white">
              {Math.round((score / questions.length) * 100)}%
            </div>
            <p className="text-sm text-slate-300">
              {score === questions.length
                ? t.resultsExcellent
                : score >= questions.length / 2
                  ? t.resultsGood
                  : t.resultsWeak}
            </p>
            {scoreByClass.length > 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t.resultsByClass}
                </p>
                <ul className="space-y-2 text-sm">
                  {scoreByClass.map(([label, stats]) => (
                    <li key={label} className="flex items-center justify-between gap-3 text-slate-200">
                      <span className="flex min-w-0 items-center gap-2">
                        <BookOpen className="h-3.5 w-3.5 shrink-0 text-purple-300" aria-hidden />
                        <span className="truncate">{label}</span>
                      </span>
                      <span className="shrink-0 font-medium text-white">
                        {stats.correct}/{stats.total}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {missedQuestions.length > 0 ? (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-rose-200/90">
                  {t.reviewMissed}
                </p>
                <ul className="space-y-3 text-sm">
                  {missedQuestions.map(({ q, i }) => (
                    <li key={`${q.question}-${i}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <p className="mb-2 text-slate-200">
                        {i + 1}. {q.question}
                      </p>
                      {q.sourceClassLabel ? (
                        <p className="mb-2 text-xs text-slate-400">{q.sourceClassLabel}</p>
                      ) : null}
                      <Link href={buildNotebookReviewHref(subject, q.sourceDocumentId, { openKit: true })}>
                        <Button variant="secondary" size="sm">
                          {t.reviewClass}
                        </Button>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {nextBlockAfterQuiz ? (
                <Link href={getStudyBlockActionHref(nextBlockAfterQuiz)}>
                  <Button type="button">
                    {tPass.quizDoneNext}: {getStudyBlockActionLabel(nextBlockAfterQuiz)}
                  </Button>
                </Link>
              ) : null}
              <Button type="button" onClick={() => void loadQuiz()}>
                {t.repeatQuiz}
              </Button>
              <Link href={`/study/notebook/${subjectSlug}`}>
                <Button variant="secondary">{t.openNotebook}</Button>
              </Link>
              <Button variant="ghost" type="button" onClick={() => router.push("/pass-mode")}>
                {tPass.backToPassMode}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
