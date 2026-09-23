"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Lightbulb, Loader2, Sparkles, Upload, XCircle } from "lucide-react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SelfCorrection } from "@/lib/schemas/self-exam-corrector";
import { logStudyActivity } from "@/lib/supabase/study-streak-db";
import { cn } from "@/lib/cn";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none";
const areaClass = `${inputClass} min-h-36`;

function Flashcard({ front, back }: { front: string; back: string }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      className="group h-36 w-full [perspective:800px]"
      aria-label={flipped ? "Ver pregunta" : "Ver respuesta"}
    >
      <div
        className={cn(
          "relative h-full w-full transition-transform duration-300 [transform-style:preserve-3d]",
          flipped && "[transform:rotateY(180deg)]",
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-white/10 bg-slate-950/60 p-4 text-center text-sm text-slate-100 [backface-visibility:hidden]">
          <span>{front}</span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-4 text-center text-sm text-indigo-100 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span>{back}</span>
        </div>
      </div>
    </button>
  );
}

function MiniQuiz({ items }: { items: SelfCorrection["miniQuiz"] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});

  function choose(i: number, option: number) {
    if (answers[i] !== undefined) return;
    setAnswers((prev) => ({ ...prev, [i]: option }));
  }

  const answered = Object.keys(answers).length;
  const correct = items.filter((item, i) => answers[i] === item.correctIndex).length;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Respondidas: {answered}/{items.length}
        {answered > 0 && ` · Acertadas: ${correct}`}
      </p>
      {items.map((item, i) => {
        const chosen = answers[i];
        const done = chosen !== undefined;
        return (
          <div key={i} className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-sm font-medium text-slate-100">
              {i + 1}. {item.question}
            </p>
            <div className="mt-3 space-y-2">
              {item.options.map((option, o) => {
                const isCorrect = o === item.correctIndex;
                const isChosen = o === chosen;
                return (
                  <button
                    key={o}
                    type="button"
                    disabled={done}
                    onClick={() => choose(i, o)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition",
                      done && isCorrect && "border-emerald-400/50 bg-emerald-500/10 text-emerald-100",
                      done && isChosen && !isCorrect && "border-rose-400/50 bg-rose-500/10 text-rose-100",
                      !done && "border-white/10 text-slate-200 hover:border-indigo-400/50 hover:bg-indigo-500/5",
                      done && !isChosen && !isCorrect && "border-white/10 text-slate-400",
                    )}
                  >
                    {done && isCorrect ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    ) : done && isChosen && !isCorrect ? (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    ) : (
                      <span className="mt-0.5 shrink-0 text-slate-500">{["A", "B", "C", "D"][o]}.</span>
                    )}
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>
            {done && (
              <p className="mt-3 flex gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
                <Lightbulb className="h-4 w-4 shrink-0 text-amber-300" />
                <span>{item.explanation}</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SelfExamCorrector() {
  const { profile, hydrated } = useKampus();
  const fileRef = useRef<HTMLInputElement>(null);

  const [subject, setSubject] = useState("");
  const [examTitle, setExamTitle] = useState("");
  const [totalPoints, setTotalPoints] = useState("20");
  const [answerKey, setAnswerKey] = useState("");
  const [studentAnswers, setStudentAnswers] = useState("");
  const [imageName, setImageName] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SelfCorrection | null>(null);

  if (!hydrated) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  if (profile.role !== "student" && profile.role !== "learner") {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Evaluación" title="Mi corrección con IA" />
        <Card>
          <CardHeader>
            <CardTitle>Sección para estudiantes</CardTitle>
            <CardDescription>
              Esta herramienta es para que los estudiantes aprendan de sus errores. Si eres docente, usa el corrector de exámenes.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Link href="/exams">
              <Button size="sm">Volver a Exámenes</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  function onPickImage(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen (foto de tu examen).");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("La foto es muy pesada (máximo 3 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result ?? "");
      if (!url.startsWith("data:image/")) {
        setError("No se pudo leer la imagen.");
        return;
      }
      setImageDataUrl(url);
      setImageName(file.name);
    };
    reader.onerror = () => setError("No se pudo leer la imagen.");
    reader.readAsDataURL(file);
  }

  async function analyze() {
    setError("");
    setResult(null);
    if (studentAnswers.trim().length < 3 && !imageDataUrl) {
      setError("Pega tus respuestas en texto o sube una foto de tu examen.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/exams/self-correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          examTitle: examTitle.trim(),
          totalPoints: Math.max(1, Math.min(1000, Number(totalPoints) || 20)),
          answerKey: answerKey.trim(),
          studentAnswers: studentAnswers.trim(),
          studentImage: imageDataUrl,
        }),
      });
      const json = (await res.json()) as { correction?: SelfCorrection; error?: string };
      if (!res.ok || !json.correction) {
        setError(json.error || "No se pudo analizar. Inténtalo de nuevo.");
        return;
      }
      setResult(json.correction);
      logStudyActivity("quiz");
    } catch {
      setError("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setStudentAnswers("");
    setImageName("");
    setImageDataUrl("");
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  if (result) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Evaluación"
          title="Tu análisis de errores"
          description="Lo importante no es la nota: es saber qué reforzar."
          actions={
            <Button size="sm" variant="secondary" onClick={reset}>
              Analizar otro examen
            </Button>
          }
        />

        <Card className="border-indigo-400/20 bg-indigo-500/[0.06]">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Nota estimada</CardTitle>
                <CardDescription>{result.estimatedLabel}</CardDescription>
              </div>
              <Badge tone="accent">{Math.round(result.percentage)}% aprox.</Badge>
            </div>
            <p className="text-xs text-slate-500">
              Es una aproximación para orientarte, no la nota oficial de tu docente.
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Qué salió mal y cómo era lo correcto</CardTitle>
            <CardDescription>Revisa cada error: entiende primero qué pasó, luego cómo se hace bien.</CardDescription>
          </CardHeader>
          <div className="space-y-3 px-6 pb-6">
            {result.errorsByQuestion.map((item, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-slate-100">{item.question}</p>
                  <Badge tone="warning">{item.topic}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  <span className="font-medium text-rose-200">Qué salió mal:</span> {item.whatWentWrong}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  <span className="font-medium text-emerald-200">Cómo era lo correcto:</span> {item.correctApproach}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Temas por reforzar</CardTitle>
          </CardHeader>
          <div className="flex flex-wrap gap-2 px-6 pb-6">
            {result.weakTopics.map((topic, i) => (
              <Badge key={i} tone="warning">{topic}</Badge>
            ))}
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-emerald-300">Día 1</CardTitle>
              <CardDescription>Hoy: entiende los errores.</CardDescription>
            </CardHeader>
            <ul className="list-disc space-y-1 px-6 pb-6 pl-10 text-sm text-slate-300">
              {result.recoveryPlan.day1.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-emerald-300">Día 2</CardTitle>
              <CardDescription>Mañana: practica hasta dominarlo.</CardDescription>
            </CardHeader>
            <ul className="list-disc space-y-1 px-6 pb-6 pl-10 text-sm text-slate-300">
              {result.recoveryPlan.day2.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tarjetas de repaso</CardTitle>
            <CardDescription>Toca cada tarjeta para ver la respuesta.</CardDescription>
          </CardHeader>
          <div className="grid gap-3 px-6 pb-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.flashcards.map((card, i) => (
              <Flashcard key={i} front={card.front} back={card.back} />
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mini-quiz de práctica</CardTitle>
            <CardDescription>Ponte a prueba: elige una opción y lee la explicación.</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <MiniQuiz items={result.miniQuiz} />
          </div>
        </Card>

        <Card className="border-emerald-400/20 bg-emerald-500/[0.06]">
          <CardHeader>
            <CardTitle>Un comentario para ti</CardTitle>
            <CardDescription>{result.encouragingComment}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evaluación"
        title="Mi corrección con IA"
        description="Sube tu examen resuelto (texto o foto). La IA te muestra qué errores cometiste, qué temas reforzar y te arma un plan de 48 horas. La nota es solo una referencia: aquí lo que cuenta es aprender."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Materia</label>
          <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ej. Matemáticas" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Nombre del examen</label>
          <input className={inputClass} value={examTitle} onChange={(e) => setExamTitle(e.target.value)} placeholder="Ej. Parcial 2" />
        </div>
      </div>

      <div className="w-40">
        <label className="mb-1 block text-xs font-medium text-slate-400">Puntaje total</label>
        <input
          type="number"
          min={1}
          max={1000}
          className={inputClass}
          value={totalPoints}
          onChange={(e) => setTotalPoints(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clave oficial <span className="font-normal text-slate-400">(opcional)</span></CardTitle>
          <CardDescription>
            Si tu docente la compartió, pégala aquí: el análisis será más preciso. Si no la tienes, la IA igual evalúa tu examen por el contenido.
          </CardDescription>
        </CardHeader>
        <div className="px-5 pb-5">
          <textarea
            className={areaClass}
            value={answerKey}
            onChange={(e) => setAnswerKey(e.target.value)}
            placeholder={"1. B\n2. Verdadero\n3. Mitocondria"}
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mis respuestas *</CardTitle>
          <CardDescription>Pégalas en texto o sube una foto de tu examen (la IA lee la letra manuscrita).</CardDescription>
        </CardHeader>
        <div className="space-y-3 px-5 pb-5">
          <textarea
            className={areaClass}
            value={studentAnswers}
            onChange={(e) => setStudentAnswers(e.target.value)}
            placeholder={"1. A\n2. Falso\n3. La mitocondria produce energía…"}
          />
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickImage(e.target.files?.[0])}
            />
            <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" />
              {imageName ? "Cambiar foto" : "Subir foto de mi examen"}
            </Button>
            {imageName && (
              <span className="truncate text-xs text-slate-400">{imageName}</span>
            )}
          </div>
          {imageDataUrl && (
            <img src={imageDataUrl} alt="Examen del estudiante" className="max-h-64 rounded-xl border border-white/10" />
          )}
        </div>
      </Card>

      {error && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>
      )}

      <Button onClick={analyze} disabled={loading} className="gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Analizando…" : "Analizar mis errores"}
      </Button>
      <p className="text-xs text-slate-500">
        Sin clave oficial, la IA evalúa por la calidad del contenido y te lo dice claramente. Con clave, compara respuesta por respuesta.
      </p>
    </div>
  );
}
