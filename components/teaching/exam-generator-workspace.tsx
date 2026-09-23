"use client";

import { FileText, Loader2, Printer, Sparkles, Trash2, Eye, EyeOff, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { GeneratedExam } from "@/lib/schemas/exam-generator";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  deleteGeneratedExam,
  listGeneratedExams,
  saveGeneratedExam,
  type SavedGeneratedExam,
} from "@/lib/supabase/exam-generator-db";
import { cn } from "@/lib/cn";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none";
const areaClass = `${inputClass} min-h-24`;
const labelClass = "text-xs font-medium text-slate-300";

type QuestionType = "mixto" | "opcion_multiple" | "verdadero_falso" | "desarrollo";
type Difficulty = "facil" | "medio" | "dificil";

const TYPE_OPTIONS: Array<{ id: QuestionType; label: string }> = [
  { id: "mixto", label: "Mixto" },
  { id: "opcion_multiple", label: "Opción múltiple" },
  { id: "verdadero_falso", label: "Verdadero / Falso" },
  { id: "desarrollo", label: "Desarrollo" },
];

const DIFFICULTY_OPTIONS: Array<{ id: Difficulty; label: string }> = [
  { id: "facil", label: "Fácil" },
  { id: "medio", label: "Medio" },
  { id: "dificil", label: "Difícil" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ExamGeneratorWorkspace() {
  const { authUserId, profile } = useKampus();

  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [questionTypes, setQuestionTypes] = useState<QuestionType>("mixto");
  const [difficulty, setDifficulty] = useState<Difficulty>("medio");
  const [totalPoints, setTotalPoints] = useState(20);
  const [context, setContext] = useState("");

  const [generating, setGenerating] = useState(false);
  const [exam, setExam] = useState<GeneratedExam | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SavedGeneratedExam[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const loadSaved = useCallback(async () => {
    if (!authUserId || !isSupabaseConfigured()) {
      setLoadingSaved(false);
      return;
    }
    try {
      const supabase = createSupabaseBrowserClient();
      setSaved(await listGeneratedExams(supabase));
    } catch {
      /* historial opcional */
    } finally {
      setLoadingSaved(false);
    }
  }, [authUserId]);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  async function handleGenerate() {
    if (!subject.trim() || !topic.trim()) {
      setMessage({ ok: false, text: "Escribe la materia y el tema del examen." });
      return;
    }
    setGenerating(true);
    setMessage(null);
    setExam(null);
    try {
      const res = await fetch("/api/teaching/exam-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          topic: topic.trim(),
          questionCount,
          questionTypes,
          difficulty,
          totalPoints,
          context: context.trim(),
        }),
      });
      const json = (await res.json()) as { exam?: GeneratedExam; error?: string };
      if (!res.ok || !json.exam) throw new Error(json.error || "No se pudo generar el examen.");
      setExam(json.exam);
      setShowKey(false);
      setMessage({ ok: true, text: "Examen generado. Revísalo antes de usarlo en clase." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "No se pudo generar el examen." });
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!exam || !authUserId || !isSupabaseConfigured()) return;
    setSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const row = await saveGeneratedExam(supabase, authUserId, {
        subject: exam.subject,
        topic: exam.topic,
        questionCount: exam.questions.length,
        questionTypes,
        difficulty,
        exam,
      });
      setSaved((prev) => [row, ...prev]);
      setMessage({ ok: true, text: "Examen guardado en tu historial." });
    } catch {
      setMessage({ ok: false, text: "No se pudo guardar. Revisa tu conexión." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!isSupabaseConfigured()) return;
    setDeletingId(id);
    try {
      const supabase = createSupabaseBrowserClient();
      await deleteGeneratedExam(supabase, id);
      setSaved((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setMessage({ ok: false, text: "No se pudo eliminar." });
    } finally {
      setDeletingId(null);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (profile.role !== "teacher") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Docencia"
          title="Generador de exámenes"
          description="Esta herramienta es para docentes. Cambia tu rol a docente en ajustes."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Docencia"
        title="Generador de exámenes con IA"
        description="Describe el tema y obtén un examen listo con su clave de respuestas. Revísalo, ajústalo e imprímelo."
      />

      {message ? (
        <p className={cn("text-sm", message.ok ? "text-emerald-300" : "text-rose-300")}>{message.text}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="border-white/10 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Datos del examen</CardTitle>
            <CardDescription>Cuanto más específico el tema, mejores las preguntas.</CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <div>
              <label className={labelClass}>Materia</label>
              <input
                className={inputClass}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej.: Biología"
              />
            </div>
            <div>
              <label className={labelClass}>Tema</label>
              <input
                className={inputClass}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ej.: Fotosíntesis: fase luminosa y ciclo de Calvin"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Preguntas: {questionCount}</label>
                <input
                  type="range"
                  min={5}
                  max={30}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className={labelClass}>Puntaje total</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  className={inputClass}
                  value={totalPoints}
                  onChange={(e) => setTotalPoints(Number(e.target.value) || 20)}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Tipo de preguntas</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {TYPE_OPTIONS.map((o) => (
                  <Button
                    key={o.id}
                    type="button"
                    size="sm"
                    variant={questionTypes === o.id ? "primary" : "secondary"}
                    onClick={() => setQuestionTypes(o.id)}
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Dificultad</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {DIFFICULTY_OPTIONS.map((o) => (
                  <Button
                    key={o.id}
                    type="button"
                    size="sm"
                    variant={difficulty === o.id ? "primary" : "secondary"}
                    onClick={() => setDifficulty(o.id)}
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Contexto opcional</label>
              <textarea
                className={areaClass}
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Lo visto en clase, ejemplos usados, temas a evitar…"
              />
            </div>
            <Button type="button" onClick={() => void handleGenerate()} disabled={generating} className="w-full gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Generando…" : "Generar examen"}
            </Button>
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          {!exam ? (
            <Card className="border-dashed border-white/15">
              <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                <FileText className="h-8 w-8 text-slate-500" />
                <p className="text-sm text-slate-400">
                  Completa los datos y genera tu examen. Aparecerá aquí con su clave de respuestas.
                </p>
              </div>
            </Card>
          ) : (
            <Card className="border-white/10">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{exam.title}</CardTitle>
                    <CardDescription>
                      {exam.questions.length} preguntas · {exam.totalPoints} puntos
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => setShowKey((v) => !v)} className="gap-1.5">
                      {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {showKey ? "Ocultar clave" : "Ver clave"}
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={handlePrint} className="gap-1.5">
                      <Printer className="h-3.5 w-3.5" />
                      Imprimir
                    </Button>
                    <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saving} className="gap-1.5">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Guardar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <div className="space-y-5 px-6 pb-6">
                <p className="text-sm text-slate-300">{exam.instructions}</p>
                {exam.questions.map((q) => (
                  <div key={q.number} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-white">
                        {q.number}. {q.question}
                      </p>
                      <Badge tone="neutral" className="shrink-0">{q.points} pts</Badge>
                    </div>
                    {q.options && q.options.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {q.options.map((opt, i) => (
                          <li key={i} className="text-sm text-slate-300">
                            <span className="font-semibold text-slate-400">
                              {String.fromCharCode(65 + i)}){" "}
                            </span>
                            {opt}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {showKey ? (
                      <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-3">
                        <p className="text-sm text-emerald-200">
                          <span className="font-semibold">Respuesta: </span>
                          {q.correctAnswer}
                        </p>
                        <p className="mt-1 text-xs text-emerald-200/70">{q.explanation}</p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="border-white/10">
            <CardHeader>
              <CardTitle className="text-base">Mis exámenes generados</CardTitle>
              <CardDescription>Historial de exámenes que guardaste.</CardDescription>
            </CardHeader>
            <div className="space-y-2 px-6 pb-6">
              {loadingSaved ? (
                <p className="text-sm text-slate-400">Cargando…</p>
              ) : saved.length === 0 ? (
                <p className="text-sm text-slate-400">Aún no guardas exámenes.</p>
              ) : (
                saved.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{s.exam.title || s.topic}</p>
                      <p className="text-xs text-slate-500">
                        {s.subject} · {s.questionCount} preguntas · {formatDate(s.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => { setExam(s.exam); setShowKey(false); }}>
                        Abrir
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-rose-200"
                        disabled={deletingId === s.id}
                        onClick={() => void handleDelete(s.id)}
                      >
                        {deletingId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
