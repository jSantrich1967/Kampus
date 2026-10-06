"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { AlarmClock, CheckCircle2, ChevronRight, ClipboardCheck, FlaskConical, Loader2, Sparkles, Swords } from "lucide-react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DiagnoseQuestion, PlanBlock } from "@/lib/schemas/cram";
import { cn } from "@/lib/cn";

type Step = "setup" | "diagnostic" | "plan";

type Plan = { headline: string; blocks: PlanBlock[] };

const KIND_STYLE: Record<PlanBlock["kind"], { label: string; className: string }> = {
  study: { label: "Estudiar", className: "bg-sky-500/15 text-sky-300" },
  practice: { label: "Practicar", className: "bg-amber-500/15 text-amber-300" },
  mock: { label: "Simulacro", className: "bg-violet-500/15 text-violet-300" },
  review: { label: "Repaso", className: "bg-emerald-500/15 text-emerald-300" },
};

function planStorageKey(subject: string, daysLeft: number) {
  return `cram-plan:${subject.trim().toLowerCase()}:${daysLeft}`;
}

export function CramMode() {
  const { profile, hydrated, authUserId } = useKampus();

  const [step, setStep] = useState<Step>("setup");
  const [subject, setSubject] = useState("");
  const [topics, setTopics] = useState("");
  const [daysLeft, setDaysLeft] = useState(1);
  const [hoursPerDay, setHoursPerDay] = useState(2);

  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<DiagnoseQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [picked, setPicked] = useState<number | null>(null);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const loggedIn = Boolean(authUserId);

  useEffect(() => {
    if (hydrated && !subject && profile.subjects.length > 0) {
      setSubject(profile.subjects[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (step === "plan" && plan) {
      try {
        const raw = localStorage.getItem(planStorageKey(subject, daysLeft));
        if (raw) setChecked(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function toggleCheck(i: number) {
    setChecked((c) => {
      const next = { ...c, [i]: !c[i] };
      try {
        localStorage.setItem(planStorageKey(subject, daysLeft), JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const topicScores = useMemo(() => {
    const map = new Map<string, { correct: number; total: number }>();
    questions.forEach((q, i) => {
      const entry = map.get(q.topic) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (answers[i] === q.answerIndex) entry.correct += 1;
      map.set(q.topic, entry);
    });
    return [...map.entries()].map(([topic, s]) => ({ topic, correct: s.correct, total: s.total }));
  }, [questions, answers]);

  const diagScore = useMemo(() => {
    const total = questions.length;
    const correct = questions.filter((q, i) => answers[i] === q.answerIndex).length;
    return { correct, total };
  }, [questions, answers]);

  async function startDiagnostic() {
    if (diagLoading || subject.trim().length < 2) return;
    setDiagLoading(true);
    setDiagError(null);
    try {
      const res = await fetch("/api/cram/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), topics: topics.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { questions?: DiagnoseQuestion[]; error?: string };
      if (!res.ok || !data.questions?.length) throw new Error(data.error || "No se pudo generar el diagnóstico.");
      setQuestions(data.questions);
      setAnswers(data.questions.map(() => null));
      setQIndex(0);
      setPicked(null);
      setStep("diagnostic");
    } catch (e) {
      setDiagError(e instanceof Error ? e.message : "No se pudo generar el diagnóstico.");
    } finally {
      setDiagLoading(false);
    }
  }

  function answerCurrent(idx: number) {
    if (picked !== null) return;
    setPicked(idx);
    setAnswers((as) => {
      const next = [...as];
      next[qIndex] = idx;
      return next;
    });
  }

  function nextQuestion() {
    if (qIndex + 1 >= questions.length) {
      buildPlan();
    } else {
      setQIndex((i) => i + 1);
      setPicked(null);
    }
  }

  async function buildPlan() {
    setPlanLoading(true);
    setPlanError(null);
    try {
      const res = await fetch("/api/cram/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          daysLeft,
          hoursPerDay,
          topics: topics.trim(),
          diagnostic: topicScores,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { plan?: Plan; error?: string };
      if (!res.ok || !data.plan) throw new Error(data.error || "No se pudo armar el plan.");
      setPlan(data.plan);
      setChecked({});
      try {
        localStorage.removeItem(planStorageKey(subject.trim(), daysLeft));
      } catch {
        /* ignore */
      }
      setStep("plan");
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : "No se pudo armar el plan.");
      // Stay on diagnostic results even if the plan fails.
      setStep("plan");
    } finally {
      setPlanLoading(false);
    }
  }

  function restart() {
    setStep("setup");
    setQuestions([]);
    setPlan(null);
    setDiagError(null);
    setPlanError(null);
  }

  if (!hydrated) return <div className="text-sm text-slate-400">Cargando…</div>;

  if (profile.role !== "student" && profile.role !== "learner") {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Estudiar" title="Modo examen" />
        <Card>
          <CardHeader>
            <CardTitle>Sección para estudiantes</CardTitle>
            <CardDescription>El modo examen está disponible para el rol Estudiante.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const current = questions[qIndex];
  const doneCount = plan ? Object.values(checked).filter(Boolean).length : 0;
  const progress = plan && plan.blocks.length > 0 ? Math.round((doneCount / plan.blocks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Estudiar"
        title="Modo examen"
        description="Dime cuándo es tu examen, responde un diagnóstico de 2 minutos y te armo el plan: qué estudiar primero, cuánto tiempo y con qué."
      />

      {!loggedIn && (
        <Card className="border-amber-400/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">Inicia sesión</CardTitle>
            <CardDescription>El modo examen usa IA y necesita tu cuenta para funcionar.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {step === "setup" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlarmClock className="h-4 w-4" aria-hidden /> ¿Cuándo es el examen?
            </CardTitle>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Materia</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej.: Física"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Temas (opcional, separados por coma)</label>
                <input
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  placeholder="Ej.: cinemática, caída libre, vectores"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">El examen es en…</label>
                <select
                  value={daysLeft}
                  onChange={(e) => setDaysLeft(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <option key={d} value={d} className="bg-slate-900">
                      {d === 1 ? "Mañana" : `En ${d} días`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Horas por día</label>
                <select
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                >
                  {[1, 2, 3, 4, 5, 6].map((h) => (
                    <option key={h} value={h} className="bg-slate-900">{h} h</option>
                  ))}
                </select>
              </div>
            </div>
            {diagError && <p role="alert" className="text-sm font-medium text-red-300">{diagError}</p>}
            <Button onClick={startDiagnostic} disabled={diagLoading || !loggedIn || subject.trim().length < 2} className="w-full md:w-auto">
              {diagLoading ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Preparando diagnóstico…</span>
              ) : (
                <span className="flex items-center gap-2"><FlaskConical className="h-4 w-4" aria-hidden /> Empezar diagnóstico (2 min)</span>
              )}
            </Button>
          </div>
        </Card>
      )}

      {step === "diagnostic" && current && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Diagnóstico: pregunta {qIndex + 1} de {questions.length}</CardTitle>
            <CardDescription>Responde con calma: esto no es un examen, es para saber por dónde empezar.</CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <p className="text-sm font-medium text-white">{current.question}</p>
            <div className="space-y-2">
              {current.options.map((opt, i) => {
                const isPicked = picked === i;
                const isCorrect = picked !== null && i === current.answerIndex;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => answerCurrent(i)}
                    disabled={picked !== null}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 text-left text-sm transition",
                      picked === null && "border-white/10 bg-white/5 text-slate-200 hover:border-white/30 hover:bg-white/10",
                      isPicked && !isCorrect && "border-red-400/50 bg-red-500/10 text-white",
                      isCorrect && "border-emerald-400/50 bg-emerald-500/10 text-white",
                      picked !== null && !isPicked && !isCorrect && "border-white/10 bg-white/5 text-slate-400",
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <Button onClick={nextQuestion} disabled={planLoading} className="w-full md:w-auto">
                {planLoading ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Armándo tu plan…</span>
                ) : (
                  <span className="flex items-center gap-2">
                    {qIndex + 1 >= questions.length ? "Ver mi plan" : "Siguiente"} <ChevronRight className="h-4 w-4" aria-hidden />
                  </span>
                )}
              </Button>
            )}
            {planError && <p role="alert" className="text-sm font-medium text-red-300">{planError}</p>}
          </div>
        </Card>
      )}

      {step === "plan" && (
        <div className="space-y-4">
          {plan ? (
            <>
              <Card className="border-violet-400/20 bg-violet-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-violet-300" aria-hidden /> Tu plan
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-200">{plan.headline}</CardDescription>
                </CardHeader>
                <div className="px-6 pb-6">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                    <span>Diagnóstico: {diagScore.correct}/{diagScore.total}</span>
                    <span>{doneCount}/{plan.blocks.length} bloques · {progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </Card>

              {plan.blocks.map((b, i) => {
                const style = KIND_STYLE[b.kind];
                const isDone = Boolean(checked[i]);
                return (
                  <Card key={i} className={cn(isDone && "opacity-60")}>
                    <div className="flex items-start gap-3 px-6 py-4">
                      <button
                        type="button"
                        onClick={() => toggleCheck(i)}
                        aria-label={isDone ? `Marcar bloque ${i + 1} como pendiente` : `Marcar bloque ${i + 1} como hecho`}
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition",
                          isDone ? "border-emerald-400 bg-emerald-500/20 text-emerald-300" : "border-white/20 text-transparent hover:border-white/50",
                        )}
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", style.className)}>{style.label}</span>
                          <span className="text-xs text-slate-400">Día {b.day} · {b.minutes} min</span>
                        </div>
                        <p className={cn("mt-1 text-sm font-semibold text-white", isDone && "line-through")}>{b.title}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{b.why}</p>
                        <ul className="mt-2 space-y-1">
                          {b.actions.map((a, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-slate-300">
                              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" aria-hidden />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Card>
                );
              })}

              <div className="flex flex-wrap gap-2">
                <Link href="/tutor" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20">
                  <Sparkles className="h-4 w-4" aria-hidden /> Reforzar con el Tutor IA
                </Link>
                <Link href="/duelos/practica?autostart=1" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20">
                  <Swords className="h-4 w-4" aria-hidden /> Practicar en un duelo
                </Link>
                <Button variant="secondary" size="sm" onClick={restart}>
                  <ClipboardCheck className="h-4 w-4" aria-hidden /> Nuevo plan
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">No se pudo armar el plan</CardTitle>
                <CardDescription>{planError || "Inténtalo de nuevo."}</CardDescription>
              </CardHeader>
              <div className="px-6 pb-6">
                <Button variant="secondary" onClick={restart}>Empezar de nuevo</Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
