"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Plus, RefreshCcw, Trash2 } from "lucide-react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudyStreakCard } from "@/components/study/study-streak-card";
import { localIsoDate } from "@/lib/calendar/local-iso-date";
import { buildPlan, recalculatePlan } from "@/lib/study/adaptive-plan";
import { logStudyActivity } from "@/lib/supabase/study-streak-db";
import {
  clearStudyPlan,
  createStudyPlan,
  loadStudyPlan,
  touchStudyPlan,
  type PlanSubject,
  type StudyPlan,
} from "@/lib/storage/study-plan-storage";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none";

type SubjectRow = { id: string; name: string; examDate: string; topics: string };

function newRow(): SubjectRow {
  return {
    id: `row_${Math.random().toString(36).slice(2, 10)}`,
    name: "",
    examDate: "",
    topics: "",
  };
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  const label = new Date(Number(y), Number(m ?? 1) - 1, Number(d ?? 1)).toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function StudentOnly() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Sala de estudio" title="Mi plan de estudio" />
      <Card>
        <CardHeader>
          <CardTitle>Sección para estudiantes</CardTitle>
          <CardDescription>
            El planificador de estudio es una herramienta pensada para quienes están estudiando.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <Link href="/study">
            <Button size="sm">Volver a la Sala de estudio</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export function AdaptivePlanner() {
  const { profile, hydrated, authUserId } = useKampus();
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Form state (no plan yet)
  const [rows, setRows] = useState<SubjectRow[]>([newRow()]);
  const [dailyHours, setDailyHours] = useState("2");
  const [formError, setFormError] = useState("");
  const [confirming, setConfirming] = useState<"recalc" | "reset" | null>(null);

  useEffect(() => {
    setPlan(loadStudyPlan(authUserId));
    setLoaded(true);
  }, [authUserId]);

  const today = useMemo(() => localIsoDate(), []);

  const upcoming = useMemo(() => {
    if (!plan) return [];
    const map = new Map<string, typeof plan.sessions>();
    for (const s of plan.sessions) {
      if (s.date <= today) continue;
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [plan, today]);

  if (!hydrated || !loaded) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  if (profile.role !== "student" && profile.role !== "learner") {
    return <StudentOnly />;
  }

  const buildFromRows = () => {
    setFormError("");
    const subjects: PlanSubject[] = rows
      .map((r) => ({
        id: r.id,
        name: r.name.trim(),
        examDate: r.examDate,
        topics: r.topics
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }))
      .filter((s) => s.name && s.examDate);

    if (subjects.length === 0) {
      setFormError("Agrega al menos una materia con su fecha de examen.");
      return;
    }
    const hours = Number(dailyHours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 12) {
      setFormError("Indica cuántas horas puedes estudiar al día (entre 0.5 y 12).");
      return;
    }

    const sessions = buildPlan(subjects, hours, today);
    if (sessions.length === 0) {
      setFormError("Las fechas de examen ya pasaron. Revisa que sean fechas futuras.");
      return;
    }
    setPlan(createStudyPlan({ subjects, dailyHours: hours, sessions }, authUserId));
  };

  const toggleSession = (id: string) => {
    if (!plan) return;
    const target = plan.sessions.find((s) => s.id === id);
    const next = touchStudyPlan(
      {
        ...plan,
        sessions: plan.sessions.map((s) => (s.id === id ? { ...s, done: !s.done } : s)),
      },
      authUserId,
    );
    setPlan(next);
    // Solo cuenta cuando se MARCA como hecha (no al desmarcar).
    if (target && !target.done) logStudyActivity("plan");
  };

  const doRecalculate = () => {
    if (!plan) return;
    const sessions = recalculatePlan(plan, today);
    setPlan(touchStudyPlan({ ...plan, sessions }, authUserId));
    setConfirming(null);
  };

  const doReset = () => {
    clearStudyPlan(authUserId);
    setPlan(null);
    setRows([newRow()]);
    setDailyHours("2");
    setConfirming(null);
  };

  const sessionsToday = plan?.sessions.filter((s) => s.date === today) ?? [];
  const doneToday = sessionsToday.filter((s) => s.done).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sala de estudio"
        title="Mi plan de estudio"
        description="Te reparto las horas de estudio entre tus materias: las que tienen el examen más cerca reciben más tiempo."
      />

      <StudyStreakCard />

      {!plan && (
        <Card>
          <CardHeader>
            <CardTitle>¿Qué tienes que estudiar?</CardTitle>
            <CardDescription>
              Agrega tus materias y la fecha de cada examen. Yo me encargo de repartir el tiempo.
            </CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            {rows.map((row, i) => (
              <div key={row.id} className="space-y-2 rounded-xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Materia {i + 1}</span>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setRows(rows.filter((r) => r.id !== row.id))}
                      className="text-xs text-slate-500 hover:text-rose-300"
                    >
                      Quitar
                    </button>
                  )}
                </div>
                <input
                  className={inputClass}
                  placeholder="Nombre de la materia (ej. Matemáticas)"
                  value={row.name}
                  onChange={(e) =>
                    setRows(rows.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)))
                  }
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="block text-xs text-slate-400">
                    Fecha del examen
                    <input
                      type="date"
                      className={`${inputClass} mt-1`}
                      value={row.examDate}
                      onChange={(e) =>
                        setRows(
                          rows.map((r) => (r.id === row.id ? { ...r, examDate: e.target.value } : r)),
                        )
                      }
                    />
                  </label>
                  <label className="block text-xs text-slate-400">
                    Temas, separados por comas (opcional)
                    <input
                      className={`${inputClass} mt-1`}
                      placeholder="Álgebra, geometría, funciones"
                      value={row.topics}
                      onChange={(e) =>
                        setRows(
                          rows.map((r) => (r.id === row.id ? { ...r, topics: e.target.value } : r)),
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setRows([...rows, newRow()])}
              className="inline-flex items-center gap-1.5 text-sm text-indigo-300 hover:text-indigo-200"
            >
              <Plus className="h-4 w-4" /> Agregar otra materia
            </button>

            <label className="block max-w-xs text-sm text-slate-300">
              ¿Cuántas horas puedes estudiar al día?
              <input
                type="number"
                min="0.5"
                max="12"
                step="0.5"
                className={`${inputClass} mt-1`}
                value={dailyHours}
                onChange={(e) => setDailyHours(e.target.value)}
              />
            </label>

            {formError && <p className="text-sm text-rose-300">{formError}</p>}

            <Button size="lg" className="w-full sm:w-auto" onClick={buildFromRows}>
              Armar mi plan
            </Button>
          </div>
        </Card>
      )}

      {plan && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Hoy te toca</CardTitle>
              <CardDescription>
                {sessionsToday.length === 0
                  ? "No hay sesiones programadas para hoy. Revisa los próximos días."
                  : doneToday === sessionsToday.length
                    ? "¡Listo! Terminaste todo lo de hoy. Buen trabajo."
                    : `Llevas ${doneToday} de ${sessionsToday.length} sesiones. Marca lo que termines.`}
              </CardDescription>
            </CardHeader>
            <ul className="space-y-2 px-6 pb-6">
              {sessionsToday.map((s) => (
                <li key={s.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                      s.done
                        ? "border-emerald-400/20 bg-emerald-400/5"
                        : "border-white/10 bg-slate-950/40 hover:border-indigo-400/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={s.done}
                      onChange={() => toggleSession(s.id)}
                      className="h-5 w-5 accent-emerald-400"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${s.done ? "text-slate-400 line-through" : "text-slate-100"}`}>
                        {s.subjectName} — {s.topic}
                      </p>
                      <p className="text-xs text-slate-500">{s.minutes} minutos</p>
                    </div>
                    {s.done && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />}
                  </label>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Próximos días</CardTitle>
              <CardDescription>Lo que viene en tu plan, día por día.</CardDescription>
            </CardHeader>
            <div className="space-y-4 px-6 pb-6">
              {upcoming.length === 0 && (
                <p className="text-sm text-slate-400">No hay más sesiones programadas.</p>
              )}
              {upcoming.map(([date, list]) => (
                <div key={date}>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <CalendarDays className="h-3.5 w-3.5" /> {formatDate(date)}
                  </p>
                  <ul className="space-y-1.5">
                    {list.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-slate-950/40 px-3 py-2"
                      >
                        <span className={`text-sm ${s.done ? "text-slate-500 line-through" : "text-slate-200"}`}>
                          {s.subjectName} — {s.topic}
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">{s.minutes} min</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            {confirming === "recalc" ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
                <span className="text-sm text-slate-200">
                  ¿Reparto de nuevo lo que no terminaste entre los días que quedan?
                </span>
                <Button size="sm" onClick={doRecalculate}>
                  Sí, recalcula
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                  Mejor no
                </Button>
              </div>
            ) : (
              <Button size="lg" variant="secondary" onClick={() => setConfirming("recalc")}>
                <RefreshCcw className="h-4 w-4" /> Voy atrasado, recalcula
              </Button>
            )}

            {confirming === "reset" ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3">
                <span className="text-sm text-slate-200">
                  Esto borra tu plan actual. ¿Seguro?
                </span>
                <Button size="sm" variant="danger" onClick={doReset}>
                  Sí, empezar de nuevo
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming("reset")}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" /> Empezar de nuevo
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
