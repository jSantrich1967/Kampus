"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Sparkles, Upload, XCircle } from "lucide-react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ExamCorrection } from "@/lib/schemas/exam-corrector";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none";
const areaClass = `${inputClass} min-h-36`;

const KEY_EXAMPLE = `1. B — La fotosíntesis ocurre en los cloroplastos
2. Verdadero — El agua hierve a 100 °C a nivel del mar
3. Mitocondria (2 pts): explicar que produce energía (ATP)`;

export function ExamCorrector() {
  const { profile, hydrated } = useKampus();
  const fileRef = useRef<HTMLInputElement>(null);

  const [studentName, setStudentName] = useState("");
  const [subject, setSubject] = useState("");
  const [examTitle, setExamTitle] = useState("");
  const [totalPoints, setTotalPoints] = useState("20");
  const [answerKey, setAnswerKey] = useState("");
  const [studentAnswers, setStudentAnswers] = useState("");
  const [imageName, setImageName] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExamCorrection | null>(null);

  if (!hydrated) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  if (profile.role !== "teacher") {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Evaluación" title="Corregir exámenes con IA" />
        <Card>
          <CardHeader>
            <CardTitle>Sección para docentes</CardTitle>
            <CardDescription>
              La corrección automática de exámenes está disponible para el rol Docente.
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
      setError("El archivo debe ser una imagen (foto del examen).");
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

  async function correct() {
    setError("");
    setResult(null);
    if (!studentName.trim()) {
      setError("Escribe el nombre del estudiante.");
      return;
    }
    if (answerKey.trim().length < 10) {
      setError("Pega la clave de respuestas (una línea por pregunta, con la respuesta correcta).");
      return;
    }
    if (studentAnswers.trim().length < 3 && !imageDataUrl) {
      setError("Pega las respuestas del estudiante o sube una foto de su examen.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/exams/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: studentName.trim(),
          subject: subject.trim(),
          examTitle: examTitle.trim(),
          totalPoints: Math.max(1, Number(totalPoints) || 20),
          answerKey: answerKey.trim(),
          studentAnswers: studentAnswers.trim(),
          studentImage: imageDataUrl,
        }),
      });
      const json = (await res.json()) as { correction?: ExamCorrection; error?: string };
      if (!res.ok || !json.correction) {
        setError(json.error || "No se pudo corregir. Inténtalo de nuevo.");
        return;
      }
      setResult(json.correction);
    } catch {
      setError("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setStudentName("");
    setStudentAnswers("");
    setImageName("");
    setImageDataUrl("");
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  if (result) {
    const passed = result.percentage >= 60;
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Evaluación"
          title="Resultado de la corrección"
          description={result.label}
          actions={
            <Button size="sm" variant="secondary" onClick={reset}>
              Corregir otro examen
            </Button>
          }
        />

        <Card className="border-indigo-400/20 bg-indigo-500/[0.06]">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">{result.studentName}</CardTitle>
              <CardDescription>Corrección generada con IA — revísala antes de publicar la nota.</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-indigo-100">
                {result.totalEarned}/{result.totalPossible}
              </div>
              <Badge tone={passed ? "success" : "danger"}>{Math.round(result.percentage)}%</Badge>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pregunta por pregunta</CardTitle>
          </CardHeader>
          <div className="space-y-3 px-6 pb-6">
            {result.items.map((item, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    {item.correct ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    )}
                    <div className="text-sm">
                      <p className="font-medium text-slate-100">{item.question}</p>
                      <p className="mt-1 text-slate-400">
                        <span className="text-slate-300">Esperado:</span> {item.expected}
                      </p>
                      <p className="text-slate-400">
                        <span className="text-slate-300">Respondió:</span> {item.studentAnswer}
                      </p>
                      <p className="mt-1 text-slate-500">{item.comment}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-slate-200">
                    {item.points}/{item.maxPoints}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-emerald-300">Lo que hizo bien</CardTitle>
            </CardHeader>
            <ul className="list-disc space-y-1 px-6 pb-6 pl-10 text-sm text-slate-300">
              {result.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-amber-300">A reforzar</CardTitle>
            </CardHeader>
            <ul className="list-disc space-y-1 px-6 pb-6 pl-10 text-sm text-slate-300">
              {result.toImprove.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Comentario general</CardTitle>
            <CardDescription>{result.generalComment}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evaluación"
        title="Corregir exámenes con IA"
        description="Sube la clave de respuestas y las respuestas del estudiante (texto o foto). La IA corrige pregunta por pregunta y te da la nota con retroalimentación."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Nombre del estudiante *</label>
          <input className={inputClass} value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Ej. María Pérez" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Materia</label>
          <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ej. Biología" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Título del examen</label>
          <input className={inputClass} value={examTitle} onChange={(e) => setExamTitle(e.target.value)} placeholder="Ej. Parcial 2" />
        </div>
      </div>

      <div className="w-40">
        <label className="mb-1 block text-xs font-medium text-slate-400">Puntaje total</label>
        <input
          type="number"
          min={1}
          className={inputClass}
          value={totalPoints}
          onChange={(e) => setTotalPoints(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clave de respuestas *</CardTitle>
          <CardDescription>
            Una línea por pregunta: número, respuesta correcta y, si quieres, el puntaje y un criterio corto.
          </CardDescription>
        </CardHeader>
        <div className="px-5 pb-2">
          <textarea
            className={areaClass}
            value={answerKey}
            onChange={(e) => setAnswerKey(e.target.value)}
            placeholder={KEY_EXAMPLE}
          />
        </div>
        <p className="px-5 pb-5 text-xs text-slate-500">
          Ejemplo: <span className="font-mono">1. B</span> · <span className="font-mono">2. Verdadero</span> ·{" "}
          <span className="font-mono">3. Mitocondria (2 pts)</span>
        </p>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Respuestas del estudiante *</CardTitle>
          <CardDescription>Pégalas en texto o sube una foto del examen (la IA lee la letra manuscrita).</CardDescription>
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
              {imageName ? "Cambiar foto" : "Subir foto del examen"}
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

      <Button onClick={correct} disabled={loading} className="gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Corrigiendo…" : "Corregir con IA"}
      </Button>
      <p className="text-xs text-slate-500">
        La IA propone la nota y la retroalimentación; el docente siempre tiene la última palabra antes de publicarla.
      </p>
    </div>
  );
}
