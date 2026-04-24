"use client";

import { FileAudio, FileImage, FileText, Link2, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RescueNotebookPicker } from "@/components/rescue/rescue-notebook-picker";
import { generateRescuePack, type RescuePack } from "@/lib/class-rescue";
import { cn } from "@/lib/cn";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SourceKind = "pdf" | "audio" | "image" | "slides" | "link" | "notes";

function readFilesAsSeed(files: File[] | null): { seed: string; label: string } {
  if (!files || files.length === 0) return { seed: "", label: "Sin archivos" };
  const names = files.map((f) => `${f.name}:${f.size}`);
  return { seed: names.join("|"), label: names.map((n) => n.split(":")[0]).join(", ") };
}

function mimeToSourceKind(mime: string): SourceKind {
  const m = mime.toLowerCase();
  if (m.includes("pdf")) return "pdf";
  if (m.startsWith("image/")) return "image";
  return "notes";
}

function Section({
  title,
  description,
  locked,
  children,
}: {
  title: string;
  description?: string;
  locked: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn(locked && "relative overflow-hidden")}>
      {locked ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-950/70 p-6 text-center backdrop-blur-sm">
          <div>
            <Badge tone="accent">Premium</Badge>
            <p className="mt-3 text-sm text-slate-200">
              Desbloquea rescates profundos: banco completo de preguntas, exportación de mapa mental y pack de examen.
            </p>
          </div>
        </div>
      ) : null}
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <div className={cn("space-y-3 text-sm text-slate-200", locked && "blur-sm")}>{children}</div>
    </Card>
  );
}

export function ClassRescueWorkspace() {
  const { profile } = useKampus();
  const searchParams = useSearchParams();

  const [subjectHint, setSubjectHint] = useState(profile.subjects[0] ?? "");
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[] | null>(null);
  const [kind, setKind] = useState<SourceKind>("notes");
  const [pack, setPack] = useState<RescuePack | null>(null);
  const [packBusy, setPackBusy] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);
  const [genHint, setGenHint] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [extractBusy, setExtractBusy] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [librarySelection, setLibrarySelection] = useState<NotebookDocumentRow | null>(null);
  const [libraryExtractBusy, setLibraryExtractBusy] = useState(false);

  const premium = profile.plan === "premium";

  const fileUrls = useMemo(() => {
    const list = files ?? [];
    return list.map((file) => ({ file, url: URL.createObjectURL(file) }));
  }, [files]);

  useEffect(() => {
    return () => {
      fileUrls.forEach((f) => URL.revokeObjectURL(f.url));
    };
  }, [fileUrls]);

  useEffect(() => {
    let cancelled = false;
    const list = files ?? [];
    if (list.length === 0) {
      setExtractBusy(false);
      if (!librarySelection) {
        setExtractedText("");
        setExtractError(null);
      }
      return;
    }

    const run = async () => {
      setExtractBusy(true);
      setExtractError(null);
      try {
        const fd = new FormData();
        list.forEach((f) => fd.append("files", f));
        const res = await fetch("/api/rescue/extract", { method: "POST", body: fd });
        const json = (await res.json()) as { combinedText?: string; error?: string };
        if (!res.ok) throw new Error(json.error || "Extraction failed");
        if (!cancelled) setExtractedText((json.combinedText || "").trim());
      } catch (e) {
        const msg = e instanceof Error ? e.message : "No pudimos leer el archivo.";
        if (!cancelled) setExtractError(msg);
      } finally {
        if (!cancelled) setExtractBusy(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [files, librarySelection]);

  async function applyLibraryDocument(doc: NotebookDocumentRow) {
    setLibrarySelection(doc);
    setFiles(null);
    setKind(mimeToSourceKind(doc.mime_type));
    setSubjectHint((prev) => (prev.trim() ? prev : doc.subject));
    setExtractError(null);
    setGenHint(null);

    const cached = doc.extracted_text?.trim();
    if (cached) {
      setExtractedText(cached);
      setLibraryExtractBusy(false);
      return;
    }

    setLibraryExtractBusy(true);
    setExtractedText("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.storage.from("notebooks").createSignedUrl(doc.storage_path, 180);
      if (error || !data?.signedUrl) throw new Error(error?.message || "No se pudo abrir el archivo en la nube.");
      const r = await fetch(data.signedUrl);
      if (!r.ok) throw new Error("No se pudo descargar el archivo.");
      const blob = await r.blob();
      const file = new File([blob], doc.filename, { type: doc.mime_type || blob.type || "application/octet-stream" });
      const fd = new FormData();
      fd.append("files", file);
      const res = await fetch("/api/rescue/extract", { method: "POST", body: fd });
      const json = (await res.json()) as { combinedText?: string; error?: string };
      if (!res.ok) throw new Error(json.error || "Extracción fallida");
      setExtractedText((json.combinedText || "").trim());
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : "No pudimos leer el archivo de la biblioteca.");
    } finally {
      setLibraryExtractBusy(false);
    }
  }

  function clearLibrarySelection() {
    setLibrarySelection(null);
    setExtractedText("");
    setExtractError(null);
  }

  useEffect(() => {
    const raw = searchParams.get("subject");
    if (!raw) return;
    try {
      setSubjectHint(decodeURIComponent(raw));
    } catch {
      setSubjectHint(raw);
    }
  }, [searchParams]);

  async function runRescue() {
    const f = readFilesAsSeed(files);
    const list = files ?? [];
    const fromLibrary = librarySelection !== null;
    // Prioritize real extracted content over pasted notes for the demo hash / fallback pack.
    const seedText = [extractedText, notes, f.seed, link].filter(Boolean).join("\n");

    setGenHint(null);
    if (list.length > 0 && extractBusy) {
      setGenHint("Espera a que termine la extracción del texto del archivo y luego genera el kit.");
      return;
    }
    if (fromLibrary && libraryExtractBusy) {
      setGenHint("Espera a que termine la lectura del archivo de tu biblioteca.");
      return;
    }
    if (list.length > 0 && !extractBusy && !extractedText.trim()) {
      setGenHint(
        "No hay texto extraído del archivo todavía (o está vacío). El kit será breve y no inventará temario genérico de la materia.",
      );
    }
    if (fromLibrary && !libraryExtractBusy && !extractedText.trim()) {
      setGenHint("No hay texto extraído del archivo de la biblioteca. Revisa permisos o vuelve a subir el archivo en Biblioteca.");
    }

    const sourceLabel =
      fromLibrary && librarySelection
        ? librarySelection.filename
        : f.seed
          ? f.label
          : link.trim()
            ? "enlace"
            : "notas";

    setPackBusy(true);
    setPackError(null);
    try {
      const res = await fetch("/api/rescue/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectHint,
          sourceLabel,
          sourceKind: kind,
          extractedFileText: extractedText,
          notes,
          link,
          uploadedFileCount: fromLibrary ? 1 : list.length,
          seedText: f.seed && !extractedText && !notes && !link ? f.seed : "",
        }),
      });
      const json = (await res.json()) as { pack?: RescuePack; error?: string };
      if (!res.ok) throw new Error(json.error || "No pudimos generar el kit.");
      if (!json.pack) throw new Error("Respuesta incompleta del servidor.");
      setPack(json.pack);
      setGenHint(null);
    } catch (e) {
      // Fallback: genera un kit básico determinístico si falla la IA.
      const msg = e instanceof Error ? e.message : "No pudimos generar el kit.";
      setPackError(msg);
      setPack(
        generateRescuePack({
          seedText,
          subjectHint,
          sourceLabel,
          sourceKind: kind,
        }),
      );
    } finally {
      setPackBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Rescate de clase"
        title="Recupera la clase en minutos."
        description="Sube material o pega un enlace. Generamos un kit de estudio completo — listo para conectar con tu pipeline de IA."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={premium ? "success" : "neutral"}>{premium ? "Premium" : "Gratis"}</Badge>
            <ShareLinkButton
              pathname="/rescue"
              campaign="rescue_pack"
              extra={{ subject: subjectHint.trim() || undefined }}
              refHandle={profile.university || "kampus"}
              label="Compartir enlace"
              copiedLabel="Copiado"
            />
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Entrada de rescate</CardTitle>
          <CardDescription>
            La IA prioriza el texto extraído de tus archivos (OCR/PDF/TXT) y tus apuntes pegados. La materia foco solo etiqueta; no sustituye al contenido del archivo.
          </CardDescription>
        </CardHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="text-slate-300">Materia foco</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring"
              value={subjectHint}
              onChange={(e) => setSubjectHint(e.target.value)}
              placeholder="Ej. Física II"
            />
          </label>

          <div className="space-y-2 text-sm">
            <span className="text-slate-300">Tipo de fuente</span>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["notes", FileText, "Notas"],
                  ["pdf", FileText, "PDF"],
                  ["slides", Sparkles, "Diapos"],
                  ["audio", FileAudio, "Audio"],
                  ["image", FileImage, "Imagen"],
                  ["link", Link2, "Link"],
                ] as const
              ).map(([id, Icon, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setKind(id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ring-1 transition",
                    kind === id ? "bg-indigo-500/20 text-white ring-indigo-400/40" : "bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <RescueNotebookPicker
              subjectFilter={subjectHint}
              activeDocId={librarySelection?.id ?? null}
              busy={libraryExtractBusy}
              onPick={(doc) => void applyLibraryDocument(doc)}
              onClear={clearLibrarySelection}
            />
          </div>

          <label className="space-y-2 text-sm md:col-span-2">
            <span className="text-slate-300">Archivos (local)</span>
            <input
              type="file"
              multiple
              className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-500/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-100 hover:file:bg-indigo-500/30"
              onChange={(e) => {
                const next = e.target.files ? Array.from(e.target.files) : null;
                if (next && next.length > 0) setLibrarySelection(null);
                setFiles(next);
              }}
            />
            <div className="text-xs text-slate-500">
              Opcional: sube aquí solo para esta sesión, o usa “Desde mi biblioteca” para archivos que ya guardaste (persisten al recargar).
            </div>
            {fileUrls.length > 0 ? (
              <div className="mt-2 space-y-2">
                {fileUrls.map(({ file, url }) => (
                  <div key={`${file.name}:${file.size}:${file.lastModified}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-slate-200">{file.name}</div>
                      <div className="text-xs text-slate-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        className="rounded-lg bg-white/5 px-3 py-1 text-xs text-slate-200 ring-1 ring-white/10 hover:bg-white/10"
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver
                      </a>
                      <a
                        className="rounded-lg bg-indigo-500/15 px-3 py-1 text-xs text-indigo-100 ring-1 ring-indigo-400/20 hover:bg-indigo-500/25"
                        href={url}
                        download={file.name}
                      >
                        Descargar
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {extractBusy || libraryExtractBusy ? (
              <div className="mt-2 text-xs text-slate-400">
                {libraryExtractBusy ? "Leyendo archivo de la biblioteca…" : "Leyendo archivo y extrayendo texto…"}
              </div>
            ) : null}
            {extractError ? (
              <div className="mt-2 text-xs text-rose-300">{extractError}</div>
            ) : null}
            {extractedText ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/40 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Vista previa (texto extraído)</div>
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
                  {extractedText.slice(0, 2400)}
                  {extractedText.length > 2400 ? "\n\n…(recortado)" : ""}
                </pre>
              </div>
            ) : null}
          </label>

          <label className="space-y-2 text-sm md:col-span-2">
            <span className="text-slate-300">URL</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://…"
            />
          </label>

          <label className="space-y-2 text-sm md:col-span-2">
            <span className="text-slate-300">Pega fragmentos / apuntes</span>
            <textarea
              className="min-h-32 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Pega lo más importante: definiciones, dudas, lo que dijo el profe…"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={runRescue}
            className="gap-2"
            disabled={packBusy || ((files?.length ?? 0) > 0 && extractBusy) || libraryExtractBusy}
          >
            <Wand2 className="h-4 w-4" />
            {packBusy ? "Generando…" : "Generar kit de rescate"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setPack(null);
              setLibrarySelection(null);
              setFiles(null);
              setExtractedText("");
              setExtractError(null);
              setGenHint(null);
              setPackError(null);
            }}
          >
            Limpiar
          </Button>
          {genHint ? <div className="text-xs text-slate-400">{genHint}</div> : null}
          {packError ? <div className="text-xs text-amber-200">Usamos un kit básico porque falló la IA: {packError}</div> : null}
        </div>
      </Card>

      {pack ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Línea de asunto</div>
              <div className="text-lg font-semibold text-white">{pack.subjectLine}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <ShareLinkButton
                pathname="/rescue"
                campaign="rescue_pack"
                extra={{ subject: subjectHint.trim() || undefined, kit: pack.subjectLine.slice(0, 40) }}
                refHandle={profile.university || "kampus"}
                label="Compartir kit"
                copiedLabel="Copiado"
              />
              <Link href="/pass-mode">
                <Button variant="secondary" size="sm">
                  Llevar esto a Modo aprobar
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Section title="Resumen rápido" locked={false} description="60 segundos de claridad">
              <p>{pack.quickSummary}</p>
            </Section>
            <Section title="Ideas clave" locked={false} description="Lo que deberías poder explicar">
              <ul className="list-disc space-y-2 pl-5">
                {pack.keyIdeas.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </Section>

            <Section title="Resumen completo" locked={!premium} description="Nivel guía">
              <p>{pack.fullSummary}</p>
            </Section>
            <Section title="Explicación profunda" locked={!premium} description="Cadena causal + límites">
              <p>{pack.deepExplanation}</p>
            </Section>

            <Section title="Probables preguntas de examen" locked={!premium}>
              <ol className="list-decimal space-y-2 pl-5">
                {pack.probableExamQuestions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ol>
            </Section>
            <Section title="Tarjetas" locked={!premium}>
              <div className="space-y-3">
                {pack.flashcards.map((c) => (
                  <div key={c.front} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Frente</div>
                    <div className="font-medium text-white">{c.front}</div>
                    <div className="mt-2 text-xs uppercase tracking-wide text-slate-400">Reverso</div>
                    <div className="text-slate-200">{c.back}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Quiz" locked={!premium}>
              <div className="space-y-4">
                {pack.quiz.map((q, idx) => (
                  <div key={q.question} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                    <div className="font-medium text-white">
                      {idx + 1}. {q.question}
                    </div>
                    <ul className="mt-2 space-y-1 text-slate-300">
                      {q.options.map((opt, i) => (
                        <li key={opt} className={cn(i === q.answerIndex && "text-emerald-200")}>
                          {String.fromCharCode(65 + i)}. {opt}
                          {i === q.answerIndex ? " (correcta)" : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Checklist de estudio" locked={false}>
              <ul className="list-disc space-y-2 pl-5">
                {pack.studyChecklist.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </Section>

            <Section title="Mapa mental (outline)" locked={!premium}>
              <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-200">{pack.mindMapOutline}</pre>
            </Section>

            <Section title="Explicación fácil" locked={!premium}>
              <p>{pack.easyExplanation}</p>
            </Section>
            <Section title="Explicación técnica" locked={!premium}>
              <p>{pack.technicalExplanation}</p>
            </Section>

            <Section title="Preguntas para hacer en clase" locked={!premium}>
              <ul className="list-disc space-y-2 pl-5">
                {pack.questionsForClass.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </Section>

            <Section title="Siguiente recurso sugerido" locked={false}>
              <p>{pack.suggestedNextResource}</p>
            </Section>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Kit vacío</CardTitle>
            <CardDescription>
              Cuando generes, verás resúmenes, quiz, checklist y más — conectado a Modo aprobar.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
