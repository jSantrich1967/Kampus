"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Lightbulb,
  Loader2,
  NotebookPen,
  RefreshCw,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNotebookCloudError } from "@/lib/notebooks/storage-errors";
import {
  sanitizeStorageFilename,
  subjectToPathSegment,
} from "@/lib/notebooks/paths";
import { readRescueExtractJson } from "@/lib/rescue/extract-upload-limits";
import type { MaterialConversion } from "@/lib/schemas/material-converter";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { logStudyActivity } from "@/lib/supabase/study-streak-db";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/cn";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none";
const areaClass = `${inputClass} min-h-36`;

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

type Step = "form" | "loading" | "result";
type Tab = "summary" | "flashcards" | "quiz";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "summary", label: "Resumen" },
  { id: "flashcards", label: "Tarjetas" },
  { id: "quiz", label: "Quiz" },
];

function buildNotebookMarkdown(conversion: MaterialConversion, subject: string): string {
  const lines: string[] = [
    `# ${conversion.title}`,
    "",
    `Materia: ${subject}`,
    `Creado con IA el ${new Date().toLocaleDateString("es-VE", { dateStyle: "long" })}`,
    "",
    "## Resumen",
    "",
    conversion.summary,
    "",
    "## Ideas clave",
    "",
  ];
  for (const p of conversion.keyPoints) lines.push(`- ${p}`);
  lines.push("", "## Tarjetas de estudio", "");
  conversion.flashcards.forEach((c, i) => {
    lines.push(`${i + 1}. **${c.front}** — ${c.back}`);
  });
  lines.push("", "## Quiz", "");
  conversion.quiz.forEach((q, i) => {
    lines.push(`${i + 1}. ${q.question}`);
    q.options.forEach((o, oi) => {
      lines.push(`   - ${oi === q.correctIndex ? "[correcta]" : "[ ]"} ${o}`);
    });
    lines.push(`   Explicación: ${q.explanation}`, "");
  });
  return lines.join("\n");
}

export function MaterialConverter() {
  const { profile, hydrated, authUserId } = useKampus();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("form");
  const [subject, setSubject] = useState("");
  const [notebookTitle, setNotebookTitle] = useState("");
  const [manualText, setManualText] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [extracting, setExtracting] = useState(false);

  const [error, setError] = useState("");
  const [result, setResult] = useState<MaterialConversion | null>(null);
  const [tab, setTab] = useState<Tab>("summary");

  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Array<number | null>>([]);
  const [quizDone, setQuizDone] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (hydrated && !subject && profile.subjects.length > 0) {
      setSubject(profile.subjects[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  if (!hydrated) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  if (profile.role !== "student" && profile.role !== "learner") {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Estudio" title="Convertir material en cuaderno" />
        <Card>
          <CardHeader>
            <CardTitle>Sección para estudiantes</CardTitle>
            <CardDescription>
              Esta herramienta crea cuadernos de estudio a partir de tu material
              y está disponible para el rol Estudiante.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Link href="/study">
              <Button size="sm">Volver a Estudio</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const combinedText = `${extractedText}\n\n${manualText}`.trim();

  async function onPickFiles(files: FileList | null) {
    setError("");
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    if (list.length > 5) {
      setError("Sube máximo 5 archivos por vez.");
      return;
    }

    const pdfs: File[] = [];
    const images: File[] = [];
    for (const f of list) {
      if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
        pdfs.push(f);
      } else if (f.type.startsWith("image/")) {
        images.push(f);
      } else {
        setError(`“${f.name}” no es un PDF ni una foto.`);
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        setError(`“${f.name}” es muy pesado (máximo 10 MB).`);
        return;
      }
    }

    setFileNames(list.map((f) => f.name));
    setExtractedText("");
    setImageDataUrl("");

    if (images.length > 0) {
      const img = images[0];
      if (img.size > MAX_IMAGE_BYTES) {
        setError(`La foto “${img.name}” es muy pesada (máximo 3 MB).`);
        return;
      }
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const url = String(reader.result ?? "");
          if (!url.startsWith("data:image/")) {
            setError("No se pudo leer la foto.");
          } else {
            setImageDataUrl(url);
          }
          resolve();
        };
        reader.onerror = () => {
          setError("No se pudo leer la foto.");
          resolve();
        };
        reader.readAsDataURL(img);
      });
    }

    if (pdfs.length > 0) {
      setExtracting(true);
      try {
        const fd = new FormData();
        for (const p of pdfs) fd.append("files", p);
        const res = await fetch("/api/rescue/extract", { method: "POST", body: fd });
        const json = await readRescueExtractJson<{ combinedText?: string; error?: string }>(res);
        if (!res.ok || !json.combinedText?.trim()) {
          setError(json.error || "No se pudo extraer el texto del PDF.");
          setFileNames([]);
          return;
        }
        setExtractedText(json.combinedText.trim());
      } catch {
        setError("No se pudo extraer el texto del PDF. Inténtalo de nuevo.");
        setFileNames([]);
      } finally {
        setExtracting(false);
      }
    }
  }

  async function convert() {
    setError("");
    if (!subject.trim()) {
      setError("Escribe la materia del material.");
      return;
    }
    if (combinedText.length < 20 && !imageDataUrl) {
      setError("Sube un PDF o una foto de tu material, o pega el texto directamente (al menos un párrafo).");
      return;
    }

    setStep("loading");
    try {
      const res = await fetch("/api/study/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          title: notebookTitle.trim() || undefined,
          materialText: combinedText,
          materialImage: imageDataUrl,
        }),
      });
      const json = (await res.json()) as { conversion?: MaterialConversion; error?: string };
      if (!res.ok || !json.conversion) {
        setError(json.error || "No se pudo crear el cuaderno. Inténtalo de nuevo.");
        setStep("form");
        return;
      }
      setResult(json.conversion);
      logStudyActivity("convertir");
      setTab("summary");
      setCardIndex(0);
      setCardFlipped(false);
      setQuizIndex(0);
      setQuizAnswers(new Array(json.conversion.quiz.length).fill(null));
      setQuizDone(false);
      setSaved(false);
      setStep("result");
    } catch {
      setError("No se pudo conectar con el servidor. Inténtalo de nuevo.");
      setStep("form");
    }
  }

  function reset() {
    setResult(null);
    setStep("form");
    setTab("summary");
    setManualText("");
    setExtractedText("");
    setFileNames([]);
    setImageDataUrl("");
    setNotebookTitle("");
    setError("");
    setSaved(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function saveToLibrary() {
    if (!result) return;
    setError("");
    if (!isSupabaseConfigured() || !authUserId) {
      setError("Para guardarlo, inicia sesión primero. Tu cuaderno no se ha perdido: vuelve a esta página cuando entres.");
      return;
    }
    const subj = subject.trim();
    setSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: nbErr } = await supabase
        .from("user_notebooks")
        .upsert({ user_id: authUserId, subject: subj });
      if (nbErr) throw nbErr;

      const markdown = buildNotebookMarkdown(result, subj);
      const safeName = sanitizeStorageFilename(`${result.title}.md`);
      const storagePath = `${authUserId}/${subjectToPathSegment(subj)}/${crypto.randomUUID()}_${safeName}`;
      const file = new File([markdown], `${result.title}.md`, { type: "text/markdown" });

      const { error: upErr } = await supabase.storage
        .from("notebooks")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: "text/markdown",
        });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("notebook_documents").insert({
        user_id: authUserId,
        subject: subj,
        topic: result.title,
        lesson_point: "",
        practice_exercises: "",
        schedule_id: null,
        class_date: null,
        storage_path: storagePath,
        filename: `${result.title}.md`,
        mime_type: "text/markdown",
        size_bytes: file.size,
        extracted_text: markdown,
      });
      if (insErr) {
        await supabase.storage.from("notebooks").remove([storagePath]);
        throw insErr;
      }

      setSaved(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo guardar el cuaderno.";
      setError(formatNotebookCloudError(msg));
    } finally {
      setSaving(false);
    }
  }

  const quizScore = result
    ? result.quiz.reduce(
        (acc, q, i) => acc + (quizAnswers[i] === q.correctIndex ? 1 : 0),
        0,
      )
    : 0;

  if (step === "loading") {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Estudio" title="Creando tu cuaderno…" />
        <Card>
          <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-300" />
            <div>
              <p className="text-sm font-medium text-slate-200">
                La IA está leyendo tu material
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Preparando el resumen, las tarjetas de estudio y el quiz. Esto
                toma unos segundos…
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (step === "result" && result) {
    const card = result.flashcards[Math.min(cardIndex, result.flashcards.length - 1)];
    const question = result.quiz[Math.min(quizIndex, result.quiz.length - 1)];
    const chosen = quizAnswers[quizIndex];
    const answeredAll = quizAnswers.every((a) => a !== null);

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Estudio"
          title={result.title}
          description={`Cuaderno generado de ${subject.trim()}`}
          actions={
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={reset} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Convertir otro
              </Button>
              {saved ? (
                <Link href="/study/library">
                  <Button size="sm" variant="secondary" className="gap-2">
                    <NotebookPen className="h-4 w-4" />
                    Ver en Mis cuadernos
                  </Button>
                </Link>
              ) : (
                <Button size="sm" onClick={saveToLibrary} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <NotebookPen className="h-4 w-4" />}
                  {saving ? "Guardando…" : "Guardar en Mis cuadernos"}
                </Button>
              )}
            </div>
          }
        />

        {error && (
          <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                tab === t.id
                  ? "bg-indigo-500/25 text-indigo-100 ring-1 ring-indigo-400/40"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "summary" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Resumen</CardTitle>
              </CardHeader>
              <p className="px-6 pb-6 text-sm leading-relaxed text-slate-300">{result.summary}</p>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Ideas clave</CardTitle>
                <CardDescription>Lo esencial del material, en pocas líneas.</CardDescription>
              </CardHeader>
              <ul className="space-y-2 px-6 pb-6">
                {result.keyPoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                    {p}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        {tab === "flashcards" && card && (
          <Card>
            <CardHeader>
              <CardTitle>Tarjetas de estudio</CardTitle>
              <CardDescription>
                Toca la tarjeta para voltearla. {cardIndex + 1} de {result.flashcards.length}
              </CardDescription>
            </CardHeader>
            <div className="space-y-4 px-6 pb-6">
              <button
                type="button"
                onClick={() => setCardFlipped((f) => !f)}
                className="flex min-h-48 w-full cursor-pointer items-center justify-center rounded-2xl border border-indigo-400/30 bg-indigo-500/[0.08] p-8 text-center transition hover:bg-indigo-500/[0.12]"
              >
                <p className="text-lg font-medium text-slate-100">
                  {cardFlipped ? card.back : card.front}
                </p>
              </button>
              <p className="text-center text-xs text-slate-500">
                {cardFlipped ? "Respuesta" : "Pregunta"} — toca para voltear
              </p>
              <div className="flex items-center justify-between">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={cardIndex === 0}
                  onClick={() => {
                    setCardIndex((i) => Math.max(0, i - 1));
                    setCardFlipped(false);
                  }}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={cardIndex === result.flashcards.length - 1}
                  onClick={() => {
                    setCardIndex((i) => Math.min(result.flashcards.length - 1, i + 1));
                    setCardFlipped(false);
                  }}
                  className="gap-2"
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {tab === "quiz" && question && (
          <Card>
            <CardHeader>
              <CardTitle>Quiz</CardTitle>
              <CardDescription>
                {quizDone
                  ? `Listo: ${quizScore} de ${result.quiz.length} correctas`
                  : `Pregunta ${quizIndex + 1} de ${result.quiz.length} — elige una opción`}
              </CardDescription>
            </CardHeader>
            <div className="space-y-4 px-6 pb-6">
              {quizDone ? (
                <div className="text-center">
                  <div className="text-4xl font-bold text-indigo-100">
                    {quizScore}/{result.quiz.length}
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {quizScore === result.quiz.length
                      ? "¡Perfecto! Dominas este material."
                      : quizScore >= result.quiz.length / 2
                        ? "Bien hecho. Repasa las que fallaste para subir la nota."
                        : "Toca repasar: vuelve a las tarjetas y al resumen e inténtalo de nuevo."}
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-4 gap-2"
                    onClick={() => {
                      setQuizAnswers(new Array(result.quiz.length).fill(null));
                      setQuizIndex(0);
                      setQuizDone(false);
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Intentar de nuevo
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-base font-medium text-slate-100">{question.question}</p>
                  <div className="space-y-2">
                    {question.options.map((opt, oi) => {
                      const isCorrect = oi === question.correctIndex;
                      const isChosen = oi === chosen;
                      return (
                        <button
                          key={oi}
                          type="button"
                          disabled={chosen !== null}
                          onClick={() => {
                            const next = [...quizAnswers];
                            next[quizIndex] = oi;
                            setQuizAnswers(next);
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition",
                            chosen === null && "border-white/10 bg-slate-950/40 hover:border-indigo-400/50 hover:bg-indigo-500/[0.08]",
                            chosen !== null && isCorrect && "border-emerald-400/40 bg-emerald-500/10",
                            chosen !== null && isChosen && !isCorrect && "border-rose-400/40 bg-rose-500/10",
                            chosen !== null && !isChosen && !isCorrect && "border-white/10 bg-slate-950/40 opacity-60",
                          )}
                        >
                          {chosen !== null && isCorrect && (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                          )}
                          {chosen !== null && isChosen && !isCorrect && (
                            <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                          )}
                          <span className="text-slate-200">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                  {chosen !== null && (
                    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                      <Badge tone={chosen === question.correctIndex ? "success" : "danger"}>
                        {chosen === question.correctIndex ? "¡Correcto!" : "Casi…"}
                      </Badge>
                      <p className="mt-2 text-sm text-slate-300">{question.explanation}</p>
                    </div>
                  )}
                  {chosen !== null && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (quizIndex === result.quiz.length - 1) setQuizDone(true);
                          else setQuizIndex((i) => i + 1);
                        }}
                        className="gap-2"
                        disabled={!answeredAll && quizIndex === result.quiz.length - 1}
                      >
                        {quizIndex === result.quiz.length - 1
                          ? answeredAll ? "Ver mi puntaje" : "Responde todas para ver tu puntaje"
                          : "Siguiente pregunta"}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Estudio"
        title="Convertir material en cuaderno"
        description="Sube un PDF o una foto de tu material (o pega el texto) y la IA crea un cuaderno con resumen, tarjetas de estudio y un quiz."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Materia *</label>
          <input
            className={inputClass}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ej. Biología"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">
            Título del cuaderno (opcional)
          </label>
          <input
            className={inputClass}
            value={notebookTitle}
            onChange={(e) => setNotebookTitle(e.target.value)}
            placeholder="Ej. Fotosíntesis — repaso del parcial"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tu material</CardTitle>
          <CardDescription>
            Sube un PDF (extraemos el texto automáticamente) o una foto (la IA la
            lee directamente), o pega el texto en el cuadro de abajo.
          </CardDescription>
        </CardHeader>
        <div className="space-y-3 px-5 pb-5">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void onPickFiles(e.target.files);
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              disabled={extracting}
              className="gap-2"
            >
              {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {extracting ? "Leyendo archivo…" : fileNames.length > 0 ? "Cambiar archivos" : "Subir PDF o foto"}
            </Button>
            {fileNames.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {fileNames.map((n) => (
                  <span
                    key={n}
                    className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-xs text-slate-400"
                  >
                    {n.toLowerCase().endsWith(".pdf") ? (
                      <FileText className="h-3 w-3" />
                    ) : (
                      <ImageIcon className="h-3 w-3" />
                    )}
                    <span className="max-w-40 truncate">{n}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          {extractedText && (
            <p className="text-xs text-emerald-300/90">
              Texto extraído del PDF listo ({extractedText.length} caracteres).
            </p>
          )}
          {imageDataUrl && (
            <div className="space-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageDataUrl}
                alt="Material de estudio"
                className="max-h-64 rounded-xl border border-white/10"
              />
              <p className="text-xs text-slate-500">
                La IA leerá la primera foto directamente{fileNames.length > 1 ? " (las demás solo cuentan si el texto sale del PDF)" : ""}.
              </p>
            </div>
          )}
          <textarea
            className={areaClass}
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="O pega aquí el texto de tu material…"
          />
        </div>
      </Card>

      {error && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      <Button onClick={convert} disabled={extracting} className="gap-2">
        <Sparkles className="h-4 w-4" />
        Crear mi cuaderno
      </Button>
      <p className="text-xs text-slate-500">
        La IA resume y organiza tu material; revisa el resultado antes de estudiar
        con él. Puedes guardarlo en Mis cuadernos cuando esté listo.
      </p>
    </div>
  );
}
