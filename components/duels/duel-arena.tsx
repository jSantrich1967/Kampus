"use client";

import { Check, Copy, Flag, Loader2, Send, Swords, Timer, Trophy, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { duelsCopy } from "@/lib/i18n/duels";
import { buildDemoSubjectQuiz } from "@/lib/study/demo-subject-quiz";
import {
  DUEL_SECONDS_PER_QUESTION,
  buildDuelShareUrl,
  decideDuelWinner,
  type DuelQuestion,
  type DuelRow,
} from "@/lib/duels/types";
import { cn } from "@/lib/cn";

type PublicDuel = Omit<DuelRow, "questions"> & {
  questions: Array<{ question: string; options: string[] }>;
};

type Phase = "loading" | "ready" | "playing" | "submitting" | "result" | "error";

type Props = {
  code: string;
  demo?: boolean;
};

type PlayResult = {
  answers: number[];
  timeMs: number;
  score: number;
  serverDuel: PublicDuel | null;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function DuelArena({ code, demo = false }: Props) {
  const { profile } = useKampus();
  const t = duelsCopy.es;
  const [phase, setPhase] = useState<Phase>("loading");
  const [duel, setDuel] = useState<PublicDuel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [copied, setCopied] = useState(false);

  // Juego
  const [order, setOrder] = useState<number[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(DUEL_SECONDS_PER_QUESTION);
  const [result, setResult] = useState<PlayResult | null>(null);
  const startRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const questions: DuelQuestion[] = useMemo(() => {
    if (demo) {
      const subject = profile.subjects?.[0] ?? "General";
      return buildDemoSubjectQuiz(subject).slice(0, 8) as DuelQuestion[];
    }
    return (duel?.questions ?? []) as DuelQuestion[];
  }, [demo, duel, profile.subjects]);

  useEffect(() => {
    if (demo) {
      setOrder(shuffle(Array.from({ length: questions.length }, (_, i) => i)));
      setPhase("ready");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/duels/${encodeURIComponent(code)}`);
        const data = (await res.json().catch(() => ({}))) as { duel?: PublicDuel; error?: string };
        if (cancelled) return;
        if (!res.ok || !data.duel) throw new Error(data.error || t.errorMessage);
        setDuel(data.duel);
        setOrder(shuffle(Array.from({ length: data.duel.questions.length }, (_, i) => i)));
        setPhase("ready");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t.errorMessage);
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, demo]);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const beginPlay = useCallback(() => {
    setAnswers([]);
    setIdx(0);
    setPicked(null);
    setResult(null);
    setError(null);
    startRef.current = Date.now();
    setPhase("playing");
  }, []);

  // Temporizador por pregunta
  useEffect(() => {
    if (phase !== "playing") return;
    setSecondsLeft(DUEL_SECONDS_PER_QUESTION);
    setPicked(null);
    stopTimer();
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // Tiempo agotado: se registra como sin respuesta (-1) y avanza.
          setAnswers((prev) => {
            if (prev.length > idx) return prev;
            return [...prev, -1];
          });
          setIdx((i) => i + 1);
          return DUEL_SECONDS_PER_QUESTION;
        }
        return s - 1;
      });
    }, 1000);
    return stopTimer;
  }, [phase, idx, stopTimer]);

  const total = order.length;
  const finished = phase === "playing" && idx >= total;

  useEffect(() => {
    if (!finished) return;
    stopTimer();
    void (async () => {
      setPhase("submitting");
      const timeMs = Date.now() - startRef.current;
      if (demo) {
        // Rival simulado: 4-7 aciertos, tiempo aleatorio.
        const rivalScore = 4 + Math.floor(Math.random() * 4);
        const rivalTime = timeMs + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 20000);
        const myScore = answers.reduce(
          (acc, a, i) => acc + (a === (questions[order[i]] as DuelQuestion)?.answerIndex ? 1 : 0),
          0,
        );
        setResult({ answers, timeMs, score: myScore, serverDuel: null });
        setDuel((d) => d); // noop
        // Guardamos el resultado demo en el estado local del duelo simulado:
        setDemoRival({ score: Math.min(rivalScore, total), timeMs: Math.max(1000, rivalTime) });
        setPhase("result");
        return;
      }
      try {
        const res = await fetch(`/api/duels/${encodeURIComponent(code)}/play`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers, timeMs, playerName: playerName.trim() }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          duel?: PublicDuel;
          yourScore?: number;
          error?: string;
        };
        if (!res.ok || !data.duel) throw new Error(data.error || t.errorMessage);
        try {
          localStorage.setItem(`duel_played_${code}`, "1");
        } catch {
          /* noop */
        }
        setDuel(data.duel);
        setResult({ answers, timeMs, score: data.yourScore ?? 0, serverDuel: data.duel });
        setPhase("result");
      } catch (e) {
        setError(e instanceof Error ? e.message : t.errorMessage);
        setPhase("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const [demoRival, setDemoRival] = useState<{ score: number; timeMs: number } | null>(null);

  function answer(i: number) {
    if (phase !== "playing" || picked !== null || idx >= total) return;
    setPicked(i);
    const next = [...answers, i];
    setAnswers(next);
    window.setTimeout(() => setIdx((v) => v + 1), 450);
  }

  function copyCode() {
    void navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  const currentQ = idx < total ? (questions[order[idx]] as DuelQuestion | undefined) : undefined;

  if (phase === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando duelo…
      </div>
    );
  }

  if (phase === "error") {
    return (
      <Card className="border-rose-400/20 bg-rose-500/5">
        <CardHeader>
          <CardTitle className="text-base">No pudimos cargar el duelo</CardTitle>
          <CardDescription>{error || t.errorMessage}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (phase === "ready") {
    return (
      <div className="mx-auto max-w-xl space-y-6 text-center">
        <PageHeader
          eyebrow={demo ? "Duelo de práctica" : `${t.eyebrow} · ${code}`}
          title={demo ? "Calienta contra el rival demo" : duel?.subject ?? t.eyebrow}
          description={demo ? t.practiceHint : t.questionsCount(total)}
        />
        {!demo ? (
          <div>
            <label htmlFor="duel-name" className="mb-1 block text-xs font-medium text-slate-300">
              {t.nameLabel}
            </label>
            <input
              id="duel-name"
              className="mx-auto w-full max-w-xs rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500"
              value={playerName}
              maxLength={60}
              placeholder={t.namePlaceholder}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>
        ) : null}
        <Button type="button" size="lg" onClick={beginPlay} className="gap-2">
          <Swords className="h-4 w-4" aria-hidden />
          {demo ? t.practiceCta : t.yourTurn}
        </Button>
      </div>
    );
  }

  if (phase === "playing" || phase === "submitting") {
    if (phase === "submitting" || !currentQ) {
      return (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Calculando resultado…
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">{t.questionOf(idx + 1, total)}</span>
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-sm font-bold",
              secondsLeft <= 5 ? "bg-rose-500/20 text-rose-200" : "bg-white/5 text-slate-200",
            )}
          >
            <Timer className="h-3.5 w-3.5" aria-hidden />
            {t.secondsLeft(secondsLeft)}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400 transition-all"
            style={{ width: `${((idx + 1) / total) * 100}%` }}
          />
        </div>
        <Card className="border-amber-400/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-lg leading-snug">{currentQ.question}</CardTitle>
          </CardHeader>
          <div className="grid gap-2 px-6 pb-6">
            {currentQ.options.map((opt, i) => {
              const isPicked = picked === i;
              const isCorrect = picked !== null && i === currentQ.answerIndex;
              const isWrongPick = isPicked && i !== currentQ.answerIndex;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={picked !== null}
                  onClick={() => answer(i)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition",
                    isCorrect && "border-emerald-400/60 bg-emerald-500/15 text-emerald-100",
                    isWrongPick && "border-rose-400/60 bg-rose-500/15 text-rose-100",
                    picked === null && "border-white/10 bg-white/5 text-slate-100 hover:border-amber-400/40 hover:bg-amber-500/10",
                    picked !== null && !isCorrect && !isWrongPick && "border-white/10 bg-white/5 text-slate-400 opacity-60",
                  )}
                >
                  <span>{opt}</span>
                  {isCorrect ? <Check className="h-4 w-4 text-emerald-300" aria-hidden /> : null}
                  {isWrongPick ? <X className="h-4 w-4 text-rose-300" aria-hidden /> : null}
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  // Resultado
  const serverDuel = result?.serverDuel ?? null;
  const myScore = result?.score ?? 0;
  let rivalName = t.rivalLabel;
  let rivalScore: number | null = null;
  let waiting = false;

  if (demo && demoRival) {
    rivalName = t.demoRivalName;
    rivalScore = demoRival.score;
  } else if (serverDuel) {
    const outcome = decideDuelWinner(serverDuel as DuelRow);
    const iAmCreator = playerName.trim()
      ? serverDuel.creator_name === playerName.trim()
      : true;
    if (iAmCreator) {
      rivalName = serverDuel.challenger_name || t.rivalLabel;
      rivalScore = outcome.challengerScore;
      waiting = rivalScore === null;
    } else {
      rivalName = serverDuel.creator_name;
      rivalScore = outcome.creatorScore;
    }
  }

  const iWon = rivalScore !== null && myScore > rivalScore;
  const iLost = rivalScore !== null && myScore < rivalScore;
  const tie = rivalScore !== null && myScore === rivalScore;

  return (
    <div className="mx-auto max-w-xl space-y-6 text-center">
      <div>
        <Trophy
          className={cn("mx-auto h-12 w-12", iWon ? "text-amber-300" : "text-slate-500")}
          aria-hidden
        />
        <h2 className="mt-3 text-2xl font-bold text-white">
          {waiting ? t.resultWaiting : iWon ? t.resultTitleWin : iLost ? t.resultTitleLose : t.resultTitleTie}
        </h2>
        {waiting ? <p className="mt-1 text-sm text-slate-400">{t.resultWaitingHint}</p> : null}
        {demo ? <p className="mt-1 text-xs text-slate-500">{t.demoResultHint}</p> : null}
      </div>

      <Card className="border-white/10 bg-white/5">
        <div className="grid grid-cols-3 items-center gap-2 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">{t.youLabel}</p>
            <p className="mt-1 text-4xl font-black text-white">{myScore}</p>
            <p className="text-xs text-slate-500">{t.correctLabel}</p>
          </div>
          <div className="text-2xl font-black text-slate-600">VS</div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">{rivalName}</p>
            <p className="mt-1 text-4xl font-black text-white">{rivalScore ?? "–"}</p>
            <p className="text-xs text-slate-500">{t.correctLabel}</p>
          </div>
        </div>
      </Card>

      {!demo && waiting ? (
        <Card className="border-indigo-400/20 bg-indigo-500/5">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-base">
              <Flag className="h-4 w-4 text-indigo-300" aria-hidden />
              {t.waitingRival}
            </CardTitle>
            <CardDescription>{t.waitingHint}</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap justify-center gap-2 px-6 pb-6">
            <Button type="button" variant="secondary" size="sm" onClick={copyCode} className="gap-1.5">
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
              {copied ? t.codeCopied : `${t.copyCode}: ${code}`}
            </Button>
            <a
              href={buildDuelShareUrl(code, duel?.subject ?? "")}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses({ size: "sm", className: "gap-1.5" })}
            >
              <Send className="h-3.5 w-3.5" aria-hidden />
              {t.shareWhatsapp}
            </a>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap justify-center gap-2">
        <Badge tone="neutral">{t.questionsCount(total)}</Badge>
      </div>
    </div>
  );
}
