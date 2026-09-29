"use client";

import { useState } from "react";

import { BadgeCheck, Camera, ClipboardList, Download, Loader2, Plus, Trash2, Users } from "lucide-react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AutoGraderResult } from "@/lib/schemas/auto-grader";
import { cn } from "@/lib/cn";

type RubricQuestion = { question: string; maxPoints: number; answerKey: string };
type RosterEntry = { name: string; perQuestion: number[]; total: number };
type Step = "rubric" | "grade" | "roster";

const EMPTY_Q: RubricQuestion = { question: "", maxPoints: 5, answerKey: "" };

export function AutoGrader() {
  const { profile, hydrated } = useKampus();

  const [step, setStep] = useState<Step>("rubric");
  const [subject, setSubject] = useState("");
  const [examTitle, setExamTitle] = useState("");
  const [questions, setQuestions] = useState<RubricQuestion[]>([{ ...EMPTY_Q }]);

  const [studentName, setStudentName] = useState("");
  const [answers, setAnswers] = useState<string[]>([""]);
  const [answerImage, setAnswerImage] = useState("");
  const [answerImageName, setAnswerImageName] = useState("");
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AutoGraderResult | null>(null);

  const [roster, setRoster] = useState<RosterEntry[]>([]);

  const totalPoints = questions.reduce((s, q) => s + (Number(q.maxPoints) || 0), 0);

  function updateQuestion(i: number, patch: Partial<RubricQuestion>) {
    setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
    setAnswers((as) => {
      const next = [...as];
      while (next.length < questions.length) next.push("");
      return next.slice(0, Math.max(questions.length, 1));
    });
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, { ...EMPTY_Q }]);
    setAnswers((as) => [...as, ""]);
  }

  function removeQuestion(i: number) {
    if (questions.length <= 1) return;
    setQuestions((qs) => qs.filter((_, j) => j !== i));
    setAnswers((as) => as.filter((_, j) => j !== i));
  }

  const rubricValid =
    subject.trim().length >= 2 &&
    questions.length > 0 &&
    questions.every((q) => q.question.trim().length >= 3 && Number(q.maxPoints) > 0);

  function onPickImage(files: FileList | null) {
    setGradeError(null);
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!f.type.startsWith("image/")) {
      setGradeError("El archivo debe ser una imagen.");
      return;
    }
    if (f.size > 3 * 1024 * 1024) {
      setGradeError("La foto es muy pesada (máximo 3 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result ?? "");
      if (!url.startsWith("data:image/")) {
        setGradeError("No se pudo leer la foto.");
        return;
      }
      setAnswerImage(url);
      setAnswerImageName(f.name);
    };
    reader.onerror = () => setGradeError("No se pudo leer la foto.");
    reader.readAsDataURL(f);
  }

  async function gradeStudent() {
    if (grading || !rubricValid || studentName.trim().length === 0) return;
    setGrading(true);
    setGradeError(null);
    setLastResult(null);
    try {
      const res = await fetch("/api/teaching/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          examTitle: examTitle.trim(),
          studentName: studentName.trim(),
          questions: questions.map((q) => ({
            question: q.question.trim(),
            maxPoints: Number(q.maxPoints),
            answerKey: q.answerKey.trim(),
          })),
          answers,
          answerImage,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        result?: AutoGraderResult;
        error?: string;
      };
      if (!res.ok || !data.result) throw new Error(data.error || "No se pudo corregir. Inténtalo de nuevo.");
      setLastResult(data.result);
    } catch (e) {
      setGradeError(e instanceof Error ? e.message : "No se pudo corregir. Inténtalo de nuevo.");
    } finally {
      setGrading(false);
    }
  }

  function addToRoster() {
    if (!lastResult) return;
    setRoster((r) => [
      ...r.filter((e) => e.name !== studentName.trim()),
      {
        name: studentName.trim(),
        perQuestion: lastResult.perQuestion.map((q) => q.score),
        total: lastResult.totalScore,
      },
    ]);
    setStudentName("");
    setAnswers(questions.map(() => ""));
    setAnswerImage("");
    setAnswerImageName("");
    setLastResult(null);
    setStep("roster");
  }

  function exportCsv() {
    const header = ["Estudiante", ...questions.map((_, i) => `P${i + 1}`), "Total"].join(";");
    const lines = roster.map((e) =>
      [e.name, ...e.perQuestion.map((s) => String(s).replace(".", ",")), String(e.total).replace(".", ",")].join(";"),
    );
    const blob = new Blob([["\uFEFF" + header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planilla-${examTitle.trim() || subject.trim() || "examen"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const classAverage =
    roster.length > 0 ? Math.round((roster.reduce((s, e) => s + e.total, 0) / roster.length) * 10) / 10 : 0;

  if (!hydrated) return <div className="text-sm text-slate-400">Cargando…</div>;

  if (profile.role !== "teacher") {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Evaluación" title="Corrección automática" />
        <Card>
          <CardHeader>
            <CardTitle>Sección para docentes</CardTitle>
            <CardDescription>La corrección automática de exámenes está disponible para el rol Docente.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const steps: Array<{ id: Step; label: string }> = [
    { id: "rubric", label: "1. Rúbrica" },
    { id: "grade", label: "2. Calificar" },
    { id: "roster", label: `3. Planilla${roster.length > 0 ? ` (${roster.length})` : ""}` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evaluación"
        title="Corrección automática"
        description="Define la rúbrica una vez y la IA califica cada examen: por pregunta, con puntaje parcial y feedback para el estudiante."
      />

      <div className="flex gap-2">
        {steps.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              step === s.id ? "bg-white text-slate-900" : "bg-white/5 text-slate-300 hover:bg-white/10",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {step === "rubric" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" aria-hidden /> Rúbrica del examen
            </CardTitle>
            <CardDescription>
              La clave y los criterios guían a la IA. Mientras más clara la rúbrica, más justa la corrección.
            </CardDescription>
          </CardHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Materia</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej.: Biología"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Título del examen (opcional)</label>
                <input
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="Ej.: Parcial 2 — Fotosíntesis"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            {questions.map((q, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Pregunta {i + 1}</span>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">Puntos</label>
                    <input
                      type="number"
                      min={0.5}
                      max={100}
                      step={0.5}
                      value={q.maxPoints}
                      onChange={(e) => updateQuestion(i, { maxPoints: Number(e.target.value) })}
                      className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
                    />
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(i)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-red-300"
                        aria-label={`Eliminar pregunta ${i + 1}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  value={q.question}
                  onChange={(e) => updateQuestion(i, { question: e.target.value })}
                  placeholder="Enunciado de la pregunta…"
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                />
                <textarea
                  value={q.answerKey}
                  onChange={(e) => updateQuestion(i, { answerKey: e.target.value })}
                  placeholder="Clave / criterios de corrección (qué debe contener una respuesta completa)…"
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                />
              </div>
            ))}

            <div className="flex items-center justify-between">
              <Button type="button" variant="secondary" size="sm" onClick={addQuestion}>
                <Plus className="h-4 w-4" aria-hidden /> Agregar pregunta
              </Button>
              <span className="text-sm text-slate-300">
                Total: <strong className="text-white">{totalPoints}</strong> puntos
              </span>
            </div>

            <Button onClick={() => rubricValid && setStep("grade")} disabled={!rubricValid} className="w-full md:w-auto">
              Continuar a calificar
            </Button>
          </div>
        </Card>
      )}

      {step === "grade" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Respuestas del estudiante</CardTitle>
              <CardDescription>Escríbelas, pégalas o sube la foto del examen respondido.</CardDescription>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Nombre del estudiante</label>
                <input
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Ej.: María Pérez"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                />
              </div>

              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-5 text-sm text-slate-300 transition hover:border-white/40 hover:bg-white/10">
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onPickImage(e.target.files)} />
                {answerImage ? (
                  <img src={answerImage} alt={answerImageName} className="max-h-40 rounded-lg object-contain" />
                ) : (
                  <span className="flex items-center gap-2">
                    <Camera className="h-5 w-5" aria-hidden /> Subir foto del examen (opcional)
                  </span>
                )}
              </label>
              {answerImage && (
                <button type="button" className="text-xs text-slate-400 underline hover:text-slate-200" onClick={() => { setAnswerImage(""); setAnswerImageName(""); }}>
                  Quitar foto
                </button>
              )}

              {questions.map((q, i) => (
                <div key={i}>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    P{i + 1} — {q.question.slice(0, 80)}{q.question.length > 80 ? "…" : ""} ({q.maxPoints} pts)
                  </label>
                  <textarea
                    value={answers[i] ?? ""}
                    onChange={(e) =>
                      setAnswers((as) => {
                        const next = [...as];
                        next[i] = e.target.value;
                        return next;
                      })
                    }
                    placeholder="Respuesta del estudiante… (vacío = sin respuesta)"
                    rows={2}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                  />
                </div>
              ))}

              {gradeError && (
                <p role="alert" className="text-sm font-medium text-red-300">{gradeError}</p>
              )}

              <Button onClick={gradeStudent} disabled={grading || !rubricValid || studentName.trim().length === 0} className="w-full md:w-auto">
                {grading ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Corrigiendo…</span>
                ) : (
                  <span className="flex items-center gap-2"><BadgeCheck className="h-4 w-4" aria-hidden /> Corregir examen</span>
                )}
              </Button>
            </div>
          </Card>

          {lastResult && (
            <Card className="border-emerald-400/20 bg-emerald-500/5">
              <CardHeader>
                <CardTitle className="text-base">
                  {studentName.trim()} — {lastResult.totalScore} / {totalPoints} puntos
                </CardTitle>
                <CardDescription>{lastResult.overallFeedback}</CardDescription>
              </CardHeader>
              <div className="space-y-3">
                {lastResult.perQuestion.map((pq, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white">Pregunta {i + 1}</span>
                      <span className={cn("font-bold", pq.score >= questions[i].maxPoints * 0.6 ? "text-emerald-300" : "text-amber-300")}>
                        {pq.score} / {questions[i].maxPoints}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-300">{pq.feedback}</p>
                  </div>
                ))}
                <Button onClick={addToRoster} className="w-full md:w-auto">
                  <Users className="h-4 w-4" aria-hidden /> Agregar a la planilla
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {step === "roster" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" aria-hidden /> Planilla — {examTitle.trim() || subject.trim() || "Examen"}
            </CardTitle>
            <CardDescription>
              {roster.length === 0
                ? "Aún no hay estudiantes calificados. Ve al paso 2 para calificar."
                : `${roster.length} estudiante(s) · Promedio: ${classAverage} / ${totalPoints}`}
            </CardDescription>
          </CardHeader>
          {roster.length > 0 && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="py-2 pr-3">Estudiante</th>
                      {questions.map((_, i) => (
                        <th key={i} className="px-2 py-2 text-center">P{i + 1}</th>
                      ))}
                      <th className="py-2 pl-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((e) => (
                      <tr key={e.name} className="border-b border-white/5 text-slate-200">
                        <td className="py-2 pr-3 font-medium text-white">{e.name}</td>
                        {e.perQuestion.map((s, i) => (
                          <td key={i} className="px-2 py-2 text-center">{s}</td>
                        ))}
                        <td className="py-2 pl-3 text-right font-bold text-white">{e.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={exportCsv}>
                  <Download className="h-4 w-4" aria-hidden /> Exportar CSV
                </Button>
                <Button variant="secondary" size="sm" onClick={() => { setStep("grade"); }}>
                  Calificar otro estudiante
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
