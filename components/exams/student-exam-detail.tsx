"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getExamById, createAttempt, listAttemptsForExam, gradeAttempt } from "@/lib/storage/exams-storage";

function buildDemoFeedback() {
  return {
    score: 78,
    summary: "Buen entendimiento general. Falta precisión en una definición y más pasos en el razonamiento.",
    strengths: ["Explicas la intuición con claridad", "Conectas el concepto con un caso real"],
    improvements: ["Añade una definición formal breve", "Muestra al menos un paso intermedio en tu argumento"],
    createdAt: new Date().toISOString(),
  };
}

export function StudentExamDetail({ examId }: { examId: string }) {
  const { profile, hydrated } = useKampus();
  const studentLabel = profile.university?.trim() ? `estudiante@${profile.university.trim()}` : "estudiante-demo";

  const exam = useMemo(() => getExamById(examId), [examId]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  const attempts = useMemo(() => {
    void refresh;
    return listAttemptsForExam(examId, studentLabel);
  }, [examId, studentLabel, refresh]);

  if (!hydrated) return <div className="text-sm text-slate-400">Cargando…</div>;
  if (!exam) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Evaluación" title="Examen no encontrado" description="Puede que haya cambiado el demo o se haya borrado el examen." />
        <Link href="/exams/student">
          <Button variant="secondary">Volver</Button>
        </Link>
      </div>
    );
  }

  function submit() {
    const next = createAttempt({ examId: exam.id, studentLabel, answers });
    setSubmittedId(next.id);
    // Demo: “calificamos” de inmediato para que el alumno vea feedback.
    gradeAttempt(next.id, buildDemoFeedback());
    setAnswers({});
    setRefresh((v) => v + 1);
  }

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
          <CardDescription>Responde en tus palabras. En el demo, el feedback se genera automáticamente.</CardDescription>
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

          <Button type="button" disabled={!canSubmit || exam.status !== "open"} onClick={submit}>
            Enviar
          </Button>
          {exam.status !== "open" ? (
            <p className="text-xs text-slate-400">Este examen está cerrado (demo). No se aceptan nuevos intentos.</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tus intentos</CardTitle>
          <CardDescription>Historial local (se guarda en tu navegador).</CardDescription>
        </CardHeader>
        <div className="space-y-3 px-5 pb-5">
          {attempts.length === 0 ? (
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

