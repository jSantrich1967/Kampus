"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";

import { KampusLogo } from "@/components/brand/kampus-logo";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { onboardingCopy } from "@/lib/i18n/onboarding";
import { anchorCanContinue, anchorForProfile } from "@/lib/onboarding/anchor-step";
import { defaultProfile, profileSchema, type UserRole } from "@/lib/schemas/profile";
import { cn } from "@/lib/cn";

type ExamRow = { subject: string; date: string };

/** Marca visual de campo obligatorio (asterisco + texto para lector de pantalla). */
function RequiredMark() {
  return (
    <>
      <span className="text-rose-300" aria-hidden>
        {" *"}
      </span>
      <span className="sr-only">(obligatorio)</span>
    </>
  );
}

const TOTAL_STEPS = 8;
/** Student / learner-only steps — skipped for teacher & institution. */
const WEAK_TOPICS_STEP = 4;
const LOAD_SCHEDULE_STEP = 5;

function skipsStudentCentricSteps(role: UserRole): boolean {
  return role === "teacher" || role === "institution";
}

function onboardingProgress(role: UserRole, step: number): { current: number; total: number } {
  if (!skipsStudentCentricSteps(role)) {
    return { current: step + 1, total: TOTAL_STEPS };
  }
  const order = [0, 1, 2, 3, 6, 7] as const;
  const idx = order.indexOf(step as (typeof order)[number]);
  const current = idx === -1 ? 1 : idx + 1;
  return { current, total: 6 };
}

export function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, hydrated, setProfile } = useKampus();
  const t = onboardingCopy.es;

  // El paso vive en la URL (?paso=N): atrás/adelante del navegador navega
  // entre pasos y recargar restaura el paso actual en vez de reiniciar en 1.
  const [step, setStepState] = useState(() => {
    const p = parseInt(searchParams.get("paso") ?? "", 10);
    return Number.isFinite(p) && p >= 1 && p <= TOTAL_STEPS ? p - 1 : 0;
  });
  const goToStep = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(TOTAL_STEPS - 1, next));
      setStepState(clamped);
      const params = new URLSearchParams(searchParams.toString());
      params.set("paso", String(clamped + 1));
      router.push(`/onboarding?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );
  // Atrás/adelante del navegador: la URL manda.
  useEffect(() => {
    const p = parseInt(searchParams.get("paso") ?? "", 10);
    if (Number.isFinite(p) && p >= 1 && p <= TOTAL_STEPS) setStepState(p - 1);
  }, [searchParams]);
  const setStep = goToStep;
  const [role, setRole] = useState<UserRole>("student");
  const [displayName, setDisplayName] = useState("");
  const [university, setUniversity] = useState("");
  const [major, setMajor] = useState("");
  const [semester, setSemester] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectDraft, setSubjectDraft] = useState("");
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [weakDraft, setWeakDraft] = useState("");
  const [missedClassesApprox, setMissedClassesApprox] = useState(0);
  const [weeklyAvailabilityHours, setWeeklyAvailabilityHours] = useState(12);
  const preferredLanguage = "es" as const;
  const [interestedInCommunity, setInterestedInCommunity] = useState(false);
  const [learningGoals, setLearningGoals] = useState("");

  // Los borradores sobreviven a una recarga (el paso lo cubre la URL).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("kampus:onboarding-draft");
      if (!raw) return;
      const d = JSON.parse(raw) as Record<string, unknown>;
      if (d.role === "student" || d.role === "teacher" || d.role === "learner" || d.role === "institution") setRole(d.role);
      if (typeof d.displayName === "string") setDisplayName(d.displayName);
      if (typeof d.university === "string") setUniversity(d.university);
      if (typeof d.major === "string") setMajor(d.major);
      if (typeof d.semester === "string") setSemester(d.semester);
      if (Array.isArray(d.subjects)) setSubjects(d.subjects.filter((s): s is string => typeof s === "string"));
      if (Array.isArray(d.exams)) setExams(d.exams.filter((e): e is ExamRow => typeof e === "object" && e !== null));
      if (Array.isArray(d.weakTopics)) setWeakTopics(d.weakTopics.filter((s): s is string => typeof s === "string"));
      if (typeof d.missedClassesApprox === "number") setMissedClassesApprox(d.missedClassesApprox);
      if (typeof d.weeklyAvailabilityHours === "number") setWeeklyAvailabilityHours(d.weeklyAvailabilityHours);
      if (typeof d.interestedInCommunity === "boolean") setInterestedInCommunity(d.interestedInCommunity);
      if (typeof d.learningGoals === "string") setLearningGoals(d.learningGoals);
    } catch {
      /* borrador corrupto: se ignora */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        "kampus:onboarding-draft",
        JSON.stringify({
          role, displayName, university, major, semester, subjects, exams,
          weakTopics, missedClassesApprox, weeklyAvailabilityHours,
          interestedInCommunity, learningGoals,
        }),
      );
    } catch {
      /* almacenamiento no disponible */
    }
  }, [role, displayName, university, major, semester, subjects, exams, weakTopics, missedClassesApprox, weeklyAvailabilityHours, interestedInCommunity, learningGoals]);

  useEffect(() => {
    if (!hydrated) return;
    if (profile.onboardingFinished) router.replace("/today");
  }, [hydrated, profile.onboardingFinished, router]);

  useEffect(() => {
    if (!skipsStudentCentricSteps(role)) return;
    if (step === WEAK_TOPICS_STEP || step === LOAD_SCHEDULE_STEP) {
      setStep(6);
    }
  }, [step, role, setStep]);

  const { current: progressCurrent, total: progressTotal } = onboardingProgress(role, step);
  const progressValue = useMemo(
    () => (progressCurrent / progressTotal) * 100,
    [progressCurrent, progressTotal],
  );

  const canContinue = useMemo(() => {
    if (step === 0) return true;
    if (step === 1) {
      return anchorCanContinue(role, { displayName, university, major, semester });
    }
    if (step === 2) return subjects.length > 0;
    if (step === 3) return true;
    if (step === WEAK_TOPICS_STEP) {
      if (skipsStudentCentricSteps(role)) return true;
      return weakTopics.length > 0;
    }
    if (step === LOAD_SCHEDULE_STEP) {
      if (skipsStudentCentricSteps(role)) return true;
      return weeklyAvailabilityHours >= 1 && weeklyAvailabilityHours <= 80 && missedClassesApprox >= 0;
    }
    if (step === 6) return learningGoals.trim().length > 6;
    if (step === 7) return true;
    return false;
  }, [
    step,
    role,
    displayName,
    university,
    major,
    semester,
    subjects.length,
    weakTopics.length,
    weeklyAvailabilityHours,
    missedClassesApprox,
    learningGoals,
  ]);

  const goNext = useCallback(() => {
    if (step === 1 && role === "teacher" && major.trim().length > 1) {
      const subject = major.trim();
      setSubjects((prev) => (prev.length > 0 ? prev : [subject]));
    }
    const next = step === 3 && skipsStudentCentricSteps(role) ? 6 : Math.min(TOTAL_STEPS - 1, step + 1);
    goToStep(next);
  }, [role, step, major, goToStep]);

  const goPrev = useCallback(() => {
    const prev = step === 6 && skipsStudentCentricSteps(role) ? 3 : Math.max(0, step - 1);
    goToStep(prev);
  }, [role, step, goToStep]);

  // Qué falta para poder continuar (paso 1): se muestra en línea en vez de
  // un error genérico al pulsar Siguiente.
  const missingStep1: string[] = useMemo(() => {
    if (step !== 1) return [];
    const missing: string[] = [];
    if (role === "teacher") {
      if (major.trim().length <= 1) missing.push("la materia principal");
    } else if (role === "institution") {
      if (university.trim().length <= 1) missing.push("el nombre del colegio o universidad");
    } else {
      if (major.trim().length <= 1) missing.push("tu carrera / programa");
      if (!semester.trim()) missing.push("el período");
    }
    return missing;
  }, [step, role, major, university, semester]);

  function addSubject() {
    const next = subjectDraft.trim();
    if (!next) return;
    setSubjects((prev) => Array.from(new Set([...prev, next])));
    setSubjectDraft("");
  }

  function addWeakTopic() {
    const next = weakDraft.trim();
    if (!next) return;
    setWeakTopics((prev) => Array.from(new Set([...prev, next])));
    setWeakDraft("");
  }

  function finish() {
    const anchor = anchorForProfile(role, { displayName, university, major, semester });
    const nextProfile = profileSchema.parse({
      ...defaultProfile,
      ...profile,
      onboardingFinished: true,
      plan: profile.plan,
      role,
      displayName: displayName.trim(),
      university: anchor.university,
      major: anchor.major,
      semester: anchor.semester,
      subjects,
      upcomingExams: exams.filter((e) => e.subject.trim() && e.date).map((e) => ({ subject: e.subject.trim(), date: e.date })),
      weakTopics: skipsStudentCentricSteps(role) ? [] : weakTopics,
      missedClassesApprox: skipsStudentCentricSteps(role) ? defaultProfile.missedClassesApprox : missedClassesApprox,
      weeklyAvailabilityHours: skipsStudentCentricSteps(role)
        ? defaultProfile.weeklyAvailabilityHours
        : weeklyAvailabilityHours,
      preferredLanguage,
      interestedInCommunity,
      learningGoals: learningGoals.trim(),
      streakDays: Math.max(profile.streakDays, 1),
      lastActiveDate: new Date().toISOString().slice(0, 10),
    });
    setProfile(nextProfile);
    try {
      sessionStorage.removeItem("kampus:onboarding-draft");
    } catch {
      /* noop */
    }
    router.push("/today");
  }

  // Sin flash del hero: si el onboarding ya terminó, no se renderiza el
  // formulario; el efecto de arriba redirige a /today.
  if (!hydrated || profile.onboardingFinished) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-slate-400">
        {hydrated ? "Redirigiendo…" : "Cargando…"}
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh w-full max-w-[100vw] overflow-x-hidden text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_420px_at_20%_0%,rgba(99,102,241,0.2),rgba(139,92,246,0.12),transparent)]" />

      {/* Full-bleed black bar (edge to edge); logo centered. `min-w-full` avoids shrink in flex parents. */}
      <header className="relative z-10 box-border flex min-h-0 min-w-full w-full shrink-0 justify-center bg-black px-4 pt-[max(1.25rem,env(safe-area-inset-top,0px))] pb-6 sm:pt-[max(1.5rem,env(safe-area-inset-top,0px))] sm:pb-8 rounded-t-2xl sm:rounded-t-3xl">
        <KampusLogo variant="hero" className="mx-auto" />
      </header>

      <div className="relative mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-6 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] sm:px-6">
        <div className="text-sm text-slate-400">{t.progress(progressCurrent, progressTotal)}</div>

        <Progress value={progressValue} />

        <Card className="border-white/10 bg-slate-950/60">
          {step === 0 ? (
            <>
              <CardHeader>
                <CardTitle className="text-2xl">{t.heroTitle}</CardTitle>
                <CardDescription className="text-base text-slate-300">{t.heroSubtitle}</CardDescription>
              </CardHeader>
              <div className="grid gap-3 md:grid-cols-3">
                {(
                  [
                    ["student", t.roles.student],
                    ["teacher", t.roles.teacher],
                    ["learner", t.roles.learner],
                    ["institution", t.roles.institution],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    className={cn(
                      "rounded-2xl border px-4 py-4 text-left text-sm transition",
                      role === value
                        ? "border-violet-400/70 bg-violet-500/10 text-white ring-1 ring-violet-400/35"
                        : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10",
                    )}
                  >
                    <div className="text-base font-semibold">{label}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {value === "student"
                        ? "Plan diario, kit del cuaderno y práctica."
                        : value === "teacher"
                          ? "Corrección y feedback más rápido."
                          : value === "learner"
                            ? "Aprende por tu cuenta con enfoque y hábito."
                          : "Riesgo de cohorte y visibilidad."}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 1 && (role === "student" || role === "learner") ? (
            <>
              <CardHeader>
                <CardTitle>Ancla académica</CardTitle>
                <CardDescription>
                  Esto personaliza comunidades, radar y recordatorios.
                </CardDescription>
              </CardHeader>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">{t.fields.name}</span>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ej.: Juan, Ana, J. Santrich…"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">{t.fields.university}</span>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="Ej.: SENA, Platzi, Coursera, Universidad Nacional…"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">
                    {t.fields.major}
                    <RequiredMark />
                  </span>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                  />
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-slate-300">
                    {t.fields.semester}
                    <RequiredMark />
                  </span>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    placeholder="Ej. 2026-1"
                  />
                </label>
              </div>
            </>
          ) : null}

          {step === 1 && role === "teacher" ? (
            <>
              <CardHeader>
                <CardTitle>Tu espacio docente</CardTitle>
                <CardDescription>
                  Cuéntanos qué enseñas. Escribir un colegio aquí no te agrega a esa institución.
                </CardDescription>
              </CardHeader>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">{t.fields.name}</span>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ej.: Ana, Carlos…"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">Dónde enseñas (opcional)</span>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="Ej.: tu academia o colegio"
                  />
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-slate-300">
                    Materia principal
                    <RequiredMark />
                  </span>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    placeholder="Ej.: Cálculo, Biología, Inglés…"
                  />
                </label>
              </div>
            </>
          ) : null}

          {step === 1 && role === "institution" ? (
            <>
              <CardHeader>
                <CardTitle>Tu institución</CardTitle>
                <CardDescription>
                  Este nombre queda en tu perfil. No abre el panel de otra organización ni crea licencias.
                </CardDescription>
              </CardHeader>
              <div className="grid gap-4">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">{t.fields.name}</span>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ej.: nombre de quien administra la cuenta"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">
                    Nombre del colegio o universidad
                    <RequiredMark />
                  </span>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="Ej.: Colegio Central"
                  />
                </label>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <CardHeader>
                <CardTitle>{t.fields.subjects}</CardTitle>
                <CardDescription>{t.fields.subjectsHint}</CardDescription>
              </CardHeader>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring"
                    value={subjectDraft}
                    onChange={(e) => setSubjectDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSubject();
                      }
                    }}
                    placeholder="Ej. Cálculo II"
                  />
                  <Button type="button" variant="secondary" onClick={addSubject}>
                    {t.chips.add}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="group inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-slate-100 ring-1 ring-white/10 hover:bg-white/10"
                      onClick={() => setSubjects((prev) => prev.filter((x) => x !== s))}
                      aria-label={`${t.chips.removeAria} ${s}`}
                    >
                      {s}
                      <span className="text-slate-400 group-hover:text-white">×</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <CardHeader>
                <CardTitle>{t.fields.exams}</CardTitle>
                <CardDescription>
                  Si aún no tienes fechas, puedes saltar — pero el modo urgencia mejora mucho con ellas.
                </CardDescription>
              </CardHeader>
              <div className="space-y-3">
                {exams.map((row, idx) => (
                  <div key={idx} className="grid gap-3 md:grid-cols-[1fr_200px_auto] md:items-end">
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-300">
                        Materia del examen
                      </span>
                      <input
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring"
                        value={row.subject}
                        onChange={(e) => {
                          const v = e.target.value;
                          setExams((prev) => prev.map((r, i) => (i === idx ? { ...r, subject: v } : r)));
                        }}
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-300">Fecha</span>
                      <input
                        type="date"
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring"
                        value={row.date}
                        onChange={(e) => {
                          const v = e.target.value;
                          setExams((prev) => prev.map((r, i) => (i === idx ? { ...r, date: v } : r)));
                        }}
                      />
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setExams((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Quitar
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setExams((prev) => [...prev, { subject: "", date: "" }])}
                >
                  {t.fields.addExam}
                </Button>
              </div>
            </>
          ) : null}

          {step === WEAK_TOPICS_STEP && !skipsStudentCentricSteps(role) ? (
            <>
              <CardHeader>
                <CardTitle>{t.fields.weakTopics}</CardTitle>
                <CardDescription>{t.fields.weakHint}</CardDescription>
              </CardHeader>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring"
                    value={weakDraft}
                    onChange={(e) => setWeakDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addWeakTopic();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={addWeakTopic}>
                    {t.chips.add}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {weakTopics.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="group inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-slate-100 ring-1 ring-white/10 hover:bg-white/10"
                      onClick={() => setWeakTopics((prev) => prev.filter((x) => x !== s))}
                      aria-label={`${t.chips.removeAria} ${s}`}
                    >
                      {s}
                      <span className="text-slate-400 group-hover:text-white">×</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {step === LOAD_SCHEDULE_STEP && !skipsStudentCentricSteps(role) ? (
            <>
              <CardHeader>
                <CardTitle>Carga y tiempo real</CardTitle>
                <CardDescription>
                  Modo aprobar usa esto para evitar sobrecarga y armar bloques alcanzables.
                </CardDescription>
              </CardHeader>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">{t.fields.missedClasses}</span>
                  <input
                    type="number"
                    min={0}
                    max={80}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring"
                    value={missedClassesApprox}
                    onChange={(e) => setMissedClassesApprox(Number(e.target.value))}
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">{t.fields.weeklyHours}</span>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring"
                    value={weeklyAvailabilityHours}
                    onChange={(e) => setWeeklyAvailabilityHours(Number(e.target.value))}
                  />
                </label>
              </div>
            </>
          ) : null}

          {step === 6 ? (
            <>
              <CardHeader>
                <CardTitle>Preferencias y meta</CardTitle>
                <CardDescription>
                  Kampus está en español. Aquí eliges la comunidad y la meta que marca el tono.
                </CardDescription>
              </CardHeader>
              <div className="space-y-4">
                <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                  <span className="text-slate-200">{t.fields.community}</span>
                  <input
                    type="checkbox"
                    checked={interestedInCommunity}
                    onChange={(e) => setInterestedInCommunity(e.target.checked)}
                    className="h-4 w-4 accent-indigo-400"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">{t.fields.goals}</span>
                  <textarea
                    className="min-h-28 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring"
                    value={learningGoals}
                    onChange={(e) => setLearningGoals(e.target.value)}
                    placeholder={
                      skipsStudentCentricSteps(role)
                        ? "Ej. Dar feedback oportuno y alinear evaluaciones con el programa."
                        : "Ej. Aprobar cálculo sin sacrificar sueño."
                    }
                  />
                </label>
              </div>
            </>
          ) : null}

          {step === 7 ? (
            <>
              <CardHeader>
                <CardTitle>Listo para tu Hoy</CardTitle>
                <CardDescription>{t.review}</CardDescription>
              </CardHeader>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-400">{t.roles[role]}</div>
                  <div className="mt-2 font-semibold text-white">
                    {role === "teacher"
                      ? `Enseña ${major.trim()}`
                      : role === "institution"
                        ? university.trim()
                        : `${university} · ${major}`}
                  </div>
                  {role === "student" || role === "learner" ? (
                    <div className="text-slate-300">{semester}</div>
                  ) : role === "teacher" && university.trim() ? (
                    <div className="text-slate-300">{university.trim()}</div>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-400">{t.fields.subjects}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {subjects.map((s) => (
                      <Badge key={s} tone="accent">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm md:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-slate-400">{t.fields.goals}</div>
                  <div className="mt-2 text-slate-100">{learningGoals}</div>
                </div>
                {role === "student" || role === "learner" ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm md:col-span-2">
                    <div className="text-xs uppercase tracking-wide text-slate-400">{t.fields.weakTopics}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {weakTopics.length > 0 ? (
                        weakTopics.map((topic) => (
                          <Badge key={topic} tone="accent">
                            {topic}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-slate-400">Ninguno</span>
                      )}
                    </div>
                    <p className="mt-3 text-slate-300">
                      {missedClassesApprox} clases perdidas · {weeklyAvailabilityHours} h por semana
                    </p>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-white/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" disabled={step === 0} onClick={goPrev}>
              {t.actions.back}
            </Button>
            {step < TOTAL_STEPS - 1 ? (
              <Button type="button" disabled={!canContinue} onClick={goNext}>
                {t.actions.next}
              </Button>
            ) : (
              <Button type="button" disabled={!canContinue} onClick={finish}>
                {t.actions.finish}
              </Button>
            )}
          </div>
          {missingStep1.length > 0 ? (
            <p className="mt-3 text-center text-xs text-amber-200/90" role="status">
              Para continuar completa: {missingStep1.join(" y ")}.
            </p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
