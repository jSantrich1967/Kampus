"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAgendaCloudError } from "@/lib/notebooks/storage-errors";
import type { Exam, ExamAttempt } from "@/lib/schemas/exams";
import {
  createAttempt,
  getExamById,
  gradeAttempt,
  listAttemptsForExam,
} from "@/lib/storage/exams-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  fetchAttemptsForExam,
  fetchExamById,
  insertAttemptRemote,
  updateAttemptFeedbackRemote,
} from "@/lib/supabase/agenda-db";
import { buildDemoGradingFeedback } from "@/lib/exams/demo-feedback-from-answers";

export function StudentExamDetail({ examId }: { examId: string }) {
  const { profile, hydrated, authUserId } = useKampus();
  const studentLabel = profile.university?.trim() ? `estudiante@${profile.university.trim()}` : "estudiante-demo";
  const useCloud = Boolean(isSupabaseConfigured() && authUserId);
  const attemptsDescription = useCloud
    ? "Historial guardado en tu cuenta (Supabase)."
    : "Historial local (se guarda en tu navegador).";

  const [exam, setExam] = useState<Exam | null>(null);
  const [loadingExam, setLoadingExam] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      setLoadingExam(true);
      setLoadError(null);
      try {
        if (useCloud) {
          const supabase = createSupabaseBrowserClient();
          const e = await fetchExamById(supabase, authUserId!, examId);
          if (!cancelled) setExam(e);
        } else {
          if (!cancelled) setExam(getExamById(examId));
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Error al cargar el examen.";
        if (!cancelled) setLoadError(formatAgendaCloudError(msg));
      } finally {
        if (!cancelled) setLoadingExam(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId, hydrated, useCloud, authUserId]);

  const loadAttempts = useCallback(async () => {
    if (!exam) return;
    setLoadingAttempts(true);
    try {
      if (useCloud) {
        const supabase = createSupabaseBrowserClient();
        const list = await fetchAttemptsForExam(supabase, authUserId!, exam.id, studentLabel);
        setAttempts(list);
      } else {
        setAttempts(listAttemptsForExam(exam.id, studentLabel));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudieron cargar los intentos.";
      setLoadError(formatAgendaCloudError(msg));
    } finally {
      setLoadingAttempts(false);
    }
  }, [exam, useCloud, authUserId, studentLabel]);

  useEffect(() => {
    void loadAttempts();
  }, [loadAttempts]);

  if (!hydrated) return <div className="text-sm text-slate-400">Cargando…</div>;

  if (loadingExam) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando examen…
      </div>
    );
  }

  if (loadError && !exam) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Evaluación" title="No se pudo cargar" description={loadError} />
        <Link href="/exams/student">
          <Button variant="secondary">Volver</Button>
        </Link>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Evaluación" title="Examen no encontrado" description="Puede que haya cambiado el id o no tengas acceso." />
        <Link href="/exams/student">
          <Button variant="secondary">Volver</Button>
        </Link>
      </div>
    );
  }

  const submit = async () => {
    const current = exam;
    if (!current || current.status !== "open") return;
    setSubmitBusy(true);
    setSubmitError(null);
    try {
      const feedback = buildDemoGradingFeedback(current, answers);
      if (useCloud) {
        const supabase = createSupabaseBrowserClient();
        const next = await insertAttemptRemote(supabase, authUserId!, {
          examId: current.id,
          studentLabel,
          answers,
        });
        setSubmittedId(next.id);
        await updateAttemptFeedbackRemote(supabase, authUserId!, next.id, feedback);
      } else {
        const next = createAttempt({ examId: current.id, studentLabel, answers });
        setSubmittedId(next.id);
        gradeAttempt(next.id, feedback);
      }
      setAnswers({});
      await loadAttempts();
    } catch (e) {
      setSubmitError(formatAgendaCloudError(e instanceof Error ? e.message : "Error al enviar."));
    } finally {
      setSubmitBusy(false);
    }
  };

  const canSubmit = exam.questions.every((q) => (answers[q.id] ?? "").trim().length > 3);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Evaluación"
        title={exam.title}
        description={`${exam.subject}${exam.dueDate ? ` · vence ${exam.dueDate}` : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/exams/student">
              <Button variant="secondary">Volver a exámenes</Button>
            </Link>
            <Badge tone={exam.status === "open" ? "success" : "neutral"}>{exam.status === "open" ? "ABIERTO" : "CERRADO"}</Badge>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Enviar intento</CardTitle>
          <CardDescription>
            Responde en tus palabras. En este demo la nota y el texto se ajustan según la{" "}
            <strong>extensión y si la respuesta parece vacía o genérica</strong> — no sustituye la corrección real de un
            profesor ni una IA que evalúe el contenido tema por tema.
          </CardDescription>
        </CardHeader>

        <div className="space-y-4 px-5 pb-5">
          {exam.questions.map((q, idx) => (
            <label key={q.id} className="block space-y-2">
              <div className="text-sm font-semibold text-white">
                {idx + 1}. {q.prompt}
              </div>
              <textarea
                className="min-h-24 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-indigo-400/40 focus:ring"
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                placeholder="Escribe tu respuesta…"
              />
            </label>
          ))}

          {submitError ? <p className="text-sm text-rose-300">{submitError}</p> : null}

          <Button
            type="button"
            disabled={!canSubmit || exam.status !== "open" || submitBusy}
            onClick={() => void submit()}
            className="gap-2"
          >
            {submitBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Enviar
          </Button>
          {exam.status !== "open" ? (
            <p className="text-xs text-slate-400">Este examen está cerrado. No se aceptan nuevos intentos.</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tus intentos</CardTitle>
          <CardDescription>{attemptsDescription}</CardDescription>
        </CardHeader>
        <div className="space-y-3 px-5 pb-5">
          {loadingAttempts ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando intentos…
            </div>
          ) : attempts.length === 0 ? (
            <div className="text-sm text-slate-400">Aún no enviaste ningún intento.</div>
          ) : (
            attempts.map((a) => (
              <div key={a.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-white">Enviado: {new Date(a.submittedAt).toLocaleString()}</div>
                  <Badge tone={a.status === "graded" ? "success" : "neutral"}>{a.status === "graded" ? "CALIFICADO" : "ENVIADO"}</Badge>
                </div>
                {a.feedback ? (
                  <div className="mt-3 space-y-2">
                    <div className="text-3xl font-semibold text-white">{a.feedback.score}%</div>
                    <p className="text-sm text-slate-200">{a.feedback.summary}</p>
                    {a.feedback.strengths.length ? (
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fortalezas</div>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-200">
                          {a.feedback.strengths.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {a.feedback.improvements.length ? (
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Mejoras</div>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-200">
                          {a.feedback.improvements.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-slate-400">Aún sin feedback.</div>
                )}

                {submittedId === a.id ? <div className="mt-2 text-xs text-indigo-200">Último intento enviado.</div> : null}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
