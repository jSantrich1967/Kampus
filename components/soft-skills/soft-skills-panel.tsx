"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Award, BookOpen, CheckCircle2, Clock, MessageSquare, Sparkles } from "lucide-react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SimulationChat } from "@/components/soft-skills/simulation-chat";
import {
  DIAGNOSTIC_QUESTIONS,
  DIAGNOSTIC_SCALE,
  ROUTE_CONTENT,
  SOFT_SKILL_DIMENSIONS,
  SOFT_SKILL_ROUTES,
  type Lesson,
  type RouteId,
} from "@/lib/soft-skills/content";
import {
  dimensionScores,
  EMPTY_PROGRESS,
  isRouteComplete,
  levelLabel,
  loadSoftSkillsProgress,
  routeProgress,
  saveSoftSkillsProgress,
  weakestDimension,
  type SoftSkillsProgress,
} from "@/lib/soft-skills/progress";

type View =
  | { kind: "home" }
  | { kind: "diagnostic" }
  | { kind: "route"; routeId: RouteId }
  | { kind: "lesson"; routeId: RouteId; lesson: Lesson };

/** Dimensión → ruta disponible que la entrena (las demás aún no tienen ruta). */
const ROUTE_BY_DIMENSION: Partial<Record<string, RouteId>> = {
  comunicacion: "comunicacion",
  tiempo: "gestion-del-tiempo",
};

function RadarChart({ scores }: { scores: Record<string, number | null> }) {
  const size = 260;
  const center = size / 2;
  const maxR = 92;
  // Orden de ejes: arriba, derecha, abajo, izquierda.
  const axes = SOFT_SKILL_DIMENSIONS;
  const point = (index: number, pct: number) => {
    const angle = (Math.PI / 2) * index - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, pct)) / 100) * maxR;
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)] as const;
  };
  const ring = (pct: number) =>
    axes.map((_, i) => point(i, pct).join(",")).join(" ");
  const valuePolygon = axes
    .map((d, i) => point(i, scores[d.id] ?? 0).join(","))
    .join(" ");
  const labelPos = (index: number) => {
    const angle = (Math.PI / 2) * index - Math.PI / 2;
    const r = maxR + 22;
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)] as const;
  };
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[280px]" role="img" aria-label="Radar de habilidades blandas">
      {[25, 50, 75, 100].map((pct) => (
        <polygon key={pct} points={ring(pct)} fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="1" />
      ))}
      {axes.map((_, i) => {
        const [x, y] = point(i, 100);
        return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="rgba(148,163,184,0.25)" strokeWidth="1" />;
      })}
      <polygon points={valuePolygon} fill="rgba(192,132,252,0.25)" stroke="rgb(192,132,252)" strokeWidth="2" />
      {axes.map((d, i) => {
        const [x, y] = point(i, scores[d.id] ?? 0);
        return <circle key={d.id} cx={x} cy={y} r="3.5" fill="rgb(192,132,252)" />;
      })}
      {axes.map((d, i) => {
        const [x, y] = labelPos(i);
        return (
          <text key={d.id} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#cbd5e1" fontSize="11">
            {d.short}
          </text>
        );
      })}
    </svg>
  );
}

export function SoftSkillsPanel() {
  const { authUserId } = useKampus();
  const [progress, setProgress] = useState<SoftSkillsProgress>({ ...EMPTY_PROGRESS });
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View>({ kind: "home" });
  const [draftAnswers, setDraftAnswers] = useState<Record<string, number>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [miniAnswer, setMiniAnswer] = useState<number | null>(null);
  const [reflectionDraft, setReflectionDraft] = useState("");

  useEffect(() => {
    const p = loadSoftSkillsProgress(authUserId);
    setProgress(p);
    setLoaded(true);
  }, [authUserId]);

  const update = (next: SoftSkillsProgress) => {
    setProgress(next);
    saveSoftSkillsProgress(next, authUserId);
  };

  const openRoute = (routeId: RouteId) => {
    const challengeId = ROUTE_CONTENT[routeId].challenge.id;
    setReflectionDraft(progress.challenges[challengeId]?.reflection ?? "");
    setView({ kind: "route", routeId });
  };

  const scores = useMemo(() => dimensionScores(progress.diagnosticAnswers), [progress.diagnosticAnswers]);
  const weakest = useMemo(() => weakestDimension(progress.diagnosticAnswers), [progress.diagnosticAnswers]);
  const diagnosticDone = progress.diagnosticCompletedAt !== null;

  if (!loaded) return <div className="text-sm text-slate-400">Cargando…</div>;

  /* ---------- Diagnóstico ---------- */
  if (view.kind === "diagnostic") {
    const q = DIAGNOSTIC_QUESTIONS[currentQ];
    const answered = draftAnswers[q.id] !== undefined;
    const isLast = currentQ === DIAGNOSTIC_QUESTIONS.length - 1;
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <button
          type="button"
          onClick={() => setView({ kind: "home" })}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Volver
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">Diagnóstico de habilidades blandas</h1>
          <p className="mt-1 text-sm text-slate-400">
            Pregunta {currentQ + 1} de {DIAGNOSTIC_QUESTIONS.length}. Responde cómo eres hoy, no cómo te gustaría
            ser: nadie ve esto sino tú.
          </p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-purple-400 transition-all"
            style={{ width: `${((currentQ + 1) / DIAGNOSTIC_QUESTIONS.length) * 100}%` }}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{q.text}</CardTitle>
            <CardDescription>{SOFT_SKILL_DIMENSIONS.find((d) => d.id === q.dimension)?.name}</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-2 px-6 pb-6">
            {DIAGNOSTIC_SCALE.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setDraftAnswers((prev) => ({ ...prev, [q.id]: s.value }))}
                className={
                  draftAnswers[q.id] === s.value
                    ? "min-h-[44px] rounded-xl bg-purple-500/25 px-4 py-2 text-sm font-medium text-purple-100 ring-1 ring-purple-300/50"
                    : "min-h-[44px] rounded-xl bg-white/5 px-4 py-2 text-sm text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10"
                }
              >
                {s.label}
              </button>
            ))}
          </div>
        </Card>
        <div className="flex justify-between">
          <Button type="button" disabled={currentQ === 0} onClick={() => setCurrentQ((c) => Math.max(0, c - 1))}>
            Anterior
          </Button>
          {isLast ? (
            <Button
              type="button"
              disabled={!answered}
              onClick={() => {
                update({
                  ...progress,
                  diagnosticAnswers: draftAnswers,
                  diagnosticCompletedAt: new Date().toISOString(),
                });
                setView({ kind: "home" });
              }}
            >
              Ver mi resultado
            </Button>
          ) : (
            <Button type="button" disabled={!answered} onClick={() => setCurrentQ((c) => c + 1)}>
              Siguiente
            </Button>
          )}
        </div>
      </div>
    );
  }

  /* ---------- Lección ---------- */
  if (view.kind === "lesson") {
    const lesson = view.lesson;
    const done = progress.lessonsCompleted.includes(lesson.id);
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <button
          type="button"
          onClick={() => openRoute(view.routeId)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Volver a la ruta
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">{lesson.title}</h1>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-400">
            <Clock className="h-4 w-4" aria-hidden /> {lesson.minutes} minutos
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-300">{lesson.intro}</p>
        </div>
        {lesson.sections.map((s) => (
          <section key={s.heading} className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">{s.heading}</h2>
            <p className="text-[15px] leading-relaxed text-slate-300">{s.body}</p>
          </section>
        ))}
        <Card>
          <CardHeader>
            <CardTitle>Ejemplo que no funciona</CardTitle>
          </CardHeader>
          <p className="px-6 pb-6 text-sm leading-relaxed text-rose-200/90">{lesson.exampleBad}</p>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ejemplo que sí funciona</CardTitle>
          </CardHeader>
          <p className="px-6 pb-6 text-sm leading-relaxed text-emerald-200/90">{lesson.exampleGood}</p>
        </Card>
        <p className="rounded-xl border border-amber-400/25 bg-amber-500/[0.06] px-4 py-3 text-sm text-slate-200">
          <strong className="text-amber-200">Error común:</strong> {lesson.commonMistake}
        </p>
        <Card>
          <CardHeader>
            <CardTitle>Comprueba que lo captaste</CardTitle>
            <CardDescription>{lesson.miniCheck.question}</CardDescription>
          </CardHeader>
          <div className="space-y-2 px-6 pb-6">
            {lesson.miniCheck.options.map((opt, i) => (
              <button
                key={opt}
                type="button"
                onClick={() => setMiniAnswer(i)}
                className={
                  miniAnswer === i
                    ? i === lesson.miniCheck.correctIndex
                      ? "block w-full rounded-xl bg-emerald-500/15 px-4 py-2.5 text-left text-sm text-emerald-100 ring-1 ring-emerald-300/40"
                      : "block w-full rounded-xl bg-rose-500/15 px-4 py-2.5 text-left text-sm text-rose-100 ring-1 ring-rose-300/40"
                    : "block w-full rounded-xl bg-white/5 px-4 py-2.5 text-left text-sm text-slate-200 ring-1 ring-white/10 transition hover:bg-white/10"
                }
              >
                {opt}
              </button>
            ))}
            {miniAnswer !== null ? (
              <p className="pt-1 text-sm text-slate-300">{lesson.miniCheck.explanation}</p>
            ) : null}
          </div>
        </Card>
        {done ? (
          <p className="inline-flex items-center gap-2 text-sm text-emerald-300">
            <CheckCircle2 className="h-4 w-4" aria-hidden /> Lección completada
          </p>
        ) : (
          <Button
            type="button"
            disabled={miniAnswer === null}
            onClick={() => {
              update({ ...progress, lessonsCompleted: [...progress.lessonsCompleted, lesson.id] });
              setMiniAnswer(null);
              openRoute(view.routeId);
            }}
          >
            Marcar lección como completada
          </Button>
        )}
        {miniAnswer === null && !done ? (
          <p className="text-xs text-slate-500">Responde la comprobación para poder marcar la lección.</p>
        ) : null}
      </div>
    );
  }

  /* ---------- Ruta (genérica) ---------- */
  if (view.kind === "route") {
    const content = ROUTE_CONTENT[view.routeId];
    const meta = SOFT_SKILL_ROUTES.find((r) => r.id === view.routeId);
    const pct = routeProgress(progress, view.routeId);
    const complete = isRouteComplete(progress, view.routeId);
    const challenge = content.challenge;
    const challengeState = progress.challenges[challenge.id] ?? { reflection: "", completed: false };
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <button
          type="button"
          onClick={() => setView({ kind: "home" })}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Volver a Habilidades
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">{meta?.title ?? view.routeId}</h1>
          <p className="mt-1 text-sm text-slate-400">
            Cuatro lecciones cortas, dos prácticas con IA y un reto en la vida real.
          </p>
        </div>
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">Tu avance</span>
            <span className="font-medium text-slate-100">{pct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-purple-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {complete ? (
          <p className="flex items-start gap-3 rounded-xl border border-amber-300/30 bg-amber-400/[0.08] px-4 py-3 text-sm text-slate-100">
            <Award className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden />
            <span>
              <strong>¡Ruta completada!</strong> Terminaste las lecciones, las dos simulaciones y el reto de{" "}
              {meta?.title ?? "esta ruta"}. Ahora toca usarlo en tu día a día.
            </span>
          </p>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">Lecciones</h2>
          {content.lessons.map((lesson, i) => {
            const done = progress.lessonsCompleted.includes(lesson.id);
            return (
              <Card key={lesson.id}>
                <div className="flex items-center justify-between gap-3 px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-slate-100">
                      {i + 1}. {lesson.title}
                    </p>
                    <p className="text-xs text-slate-400">{lesson.minutes} min de lectura y práctica</p>
                  </div>
                  {done ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-sm text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" aria-hidden /> Hecha
                    </span>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => {
                        setMiniAnswer(null);
                        setView({ kind: "lesson", routeId: view.routeId, lesson });
                      }}
                    >
                      <BookOpen className="mr-1.5 h-4 w-4" aria-hidden /> Abrir
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">Práctica con IA</h2>
          {content.simulations.map((sim) => (
            <Card key={sim.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-purple-300" aria-hidden /> {sim.title}
                </CardTitle>
                <CardDescription>Aproximadamente {sim.minutes} minutos de práctica guiada.</CardDescription>
              </CardHeader>
              <div className="px-6 pb-6">
                <SimulationChat
                  simulation={sim}
                  completed={progress.simulationsCompleted.includes(sim.id)}
                  onComplete={() =>
                    update({
                      ...progress,
                      simulationsCompleted: progress.simulationsCompleted.includes(sim.id)
                        ? progress.simulationsCompleted
                        : [...progress.simulationsCompleted, sim.id],
                    })
                  }
                />
              </div>
            </Card>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">{challenge.title}</h2>
          <Card>
            <div className="space-y-4 px-6 py-5">
              <p className="text-sm leading-relaxed text-slate-300">{challenge.description}</p>
              <textarea
                value={reflectionDraft}
                onChange={(e) => setReflectionDraft(e.target.value)}
                rows={4}
                placeholder="Tu reflexión en 2 o 3 líneas…"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                aria-label="Tu reflexión del reto"
              />
              {challengeState.completed ? (
                <p className="inline-flex items-center gap-2 text-sm text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> Reto completado
                </p>
              ) : null}
              <div>
                <Button
                  type="button"
                  disabled={reflectionDraft.trim().length < 10}
                  onClick={() =>
                    update({
                      ...progress,
                      challenges: {
                        ...progress.challenges,
                        [challenge.id]: { reflection: reflectionDraft.trim(), completed: true },
                      },
                    })
                  }
                >
                  {challengeState.completed ? "Guardar cambios" : "Completar el reto"}
                </Button>
              </div>
            </div>
          </Card>
        </section>
      </div>
    );
  }

  /* ---------- Inicio del módulo ---------- */
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold text-slate-50">
          <Sparkles className="h-6 w-6 text-purple-300" aria-hidden /> Habilidades blandas
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-300">
          Saber la materia no basta: también hay que saber explicarla, trabajar con otros y organizarse. Aquí entrenas
          esas habilidades igual que una materia: diagnóstico, lecciones cortas, práctica con IA y retos reales.
        </p>
      </div>

      {!diagnosticDone ? (
        <Card>
          <CardHeader>
            <CardTitle>Empieza por tu diagnóstico</CardTitle>
            <CardDescription>
              12 preguntas, dos minutos. Al terminar verás tu radar: en qué habilidad estás fuerte y cuál te conviene
              entrenar primero.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Button
              type="button"
              onClick={() => {
                setDraftAnswers(progress.diagnosticAnswers);
                setCurrentQ(0);
                setView({ kind: "diagnostic" });
              }}
            >
              Hacer el diagnóstico
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Tu radar de habilidades</CardTitle>
            <CardDescription>
              {weakest
                ? `Tu punto a trabajar: ${SOFT_SKILL_DIMENSIONS.find((d) => d.id === weakest)?.name}. ${
                    ROUTE_BY_DIMENSION[weakest]
                      ? "Su ruta ya está disponible aquí abajo."
                      : "Su ruta llega pronto; mientras tanto, las rutas disponibles también te ayudan a entrenarla."
                  }`
                : ""}
            </CardDescription>
          </CardHeader>
          <div className="grid gap-6 px-6 pb-6 sm:grid-cols-2">
            <RadarChart scores={scores} />
            <ul className="space-y-3 self-center">
              {SOFT_SKILL_DIMENSIONS.map((d) => {
                const v = scores[d.id];
                return (
                  <li key={d.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-200">{d.name}</span>
                      <span className="text-slate-400">
                        {v === null ? "—" : `${v}% · ${levelLabel(v)}`}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-purple-400" style={{ width: `${v ?? 0}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="px-6 pb-6">
            <button
              type="button"
              className="text-sm text-slate-400 underline underline-offset-2 transition hover:text-slate-200"
              onClick={() => {
                setDraftAnswers(progress.diagnosticAnswers);
                setCurrentQ(0);
                setView({ kind: "diagnostic" });
              }}
            >
              Repetir el diagnóstico
            </button>
          </div>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">Rutas de entrenamiento</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SOFT_SKILL_ROUTES.map((route) => {
            const routeId = route.id as RouteId;
            const pct = route.available ? routeProgress(progress, routeId) : 0;
            const complete = route.available ? isRouteComplete(progress, routeId) : false;
            return (
              <Card key={route.id}>
                <div className="space-y-3 px-6 py-5">
                  <p className="text-sm font-medium text-slate-100">{route.title}</p>
                  <p className="text-sm text-slate-400">{route.tagline}</p>
                  {route.available ? (
                    <div className="flex items-center gap-3">
                      <Button type="button" onClick={() => openRoute(routeId)}>
                        {pct > 0 ? `Continuar · ${pct}%` : "Empezar la ruta"}
                      </Button>
                      {complete ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-amber-300">
                          <Award className="h-4 w-4" aria-hidden /> Completada
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="inline-block rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-400 ring-1 ring-white/10">
                      Pronto
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
