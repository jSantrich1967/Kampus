"use client";

import { FileAudio, FileImage, FileText, Link2, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RescueNotebookPicker } from "@/components/rescue/rescue-notebook-picker";
import { RescuePackDisplay } from "@/components/rescue/rescue-pack-display";
import type { RescuePack } from "@/lib/class-rescue";
import { cn } from "@/lib/cn";
import { combineNotebookExtractedTextForPack } from "@/lib/notebooks/document-tags";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import { subjectToPathSegment } from "@/lib/notebooks/paths";
import { buildRescueSourceDocumentBody, buildRescueTagNotesSection } from "@/lib/notebooks/rescue-pack-plain-text";
import { saveRescueNotebookSource } from "@/lib/notebooks/save-rescue-source-document";
import { postRescuePack } from "@/lib/rescue/post-rescue-pack";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

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

export function ClassRescueWorkspace() {
  const router = useRouter();
  const { profile, authUserId } = useKampus();
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
  /** Whole-notebook import from URL ?notebook=slug (combined extracted text). */
  const [notebookBundleSlug, setNotebookBundleSlug] = useState<string | null>(null);
  const [notebookDocCount, setNotebookDocCount] = useState(0);
  const lastNotebookFromUrl = useRef<string>("");
  /** Misma clasificación que al subir hojas en Mis cuadernos (Tema / Punto / Ejercicios). */
  const [kitTopic, setKitTopic] = useState("");
  const [kitLessonPoint, setKitLessonPoint] = useState("");
  const [kitPracticeExercises, setKitPracticeExercises] = useState("");
  const [saveKitBusy, setSaveKitBusy] = useState(false);
  const [saveKitMessage, setSaveKitMessage] = useState<string | null>(null);

  const premium = profile.plan === "premium";

  const hasSaveableRescueSource = useMemo(
    () => Boolean(buildRescueSourceDocumentBody(extractedText, notes, link).trim()),
    [extractedText, notes, link],
  );

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
      if (!librarySelection && !notebookBundleSlug) {
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
  }, [files, librarySelection, notebookBundleSlug]);

  async function applyLibraryDocument(doc: NotebookDocumentRow) {
    setNotebookBundleSlug(null);
    setNotebookDocCount(0);
    setLibrarySelection(doc);
    setFiles(null);
    setKind(mimeToSourceKind(doc.mime_type));
    setSubjectHint((prev) => (prev.trim() ? prev : doc.subject));
    setKitTopic(doc.topic ?? "");
    setKitLessonPoint(doc.lesson_point ?? "");
    setKitPracticeExercises(doc.practice_exercises ?? "");
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
      setExtractError(e instanceof Error ? e.message : "No pudimos leer el archivo desde Mis cuadernos.");
    } finally {
      setLibraryExtractBusy(false);
    }
  }

  function clearLibrarySelection() {
    setLibrarySelection(null);
    setExtractedText("");
    setExtractError(null);
    setKitTopic("");
    setKitLessonPoint("");
    setKitPracticeExercises("");
  }

  useEffect(() => {
    const nb = searchParams.get("notebook")?.trim();
    if (!nb) {
      lastNotebookFromUrl.current = "";
      return;
    }
    if (!authUserId || !isSupabaseConfigured()) return;

    let cancelled = false;
    const loadKey = `${authUserId}::${nb}`;
    if (lastNotebookFromUrl.current === loadKey) return;

    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("notebook_documents")
          .select("*")
          .eq("user_id", authUserId)
          .order("created_at", { ascending: true });
        if (cancelled || error) return;
        const rows = (data as NotebookDocumentRow[]) ?? [];
        const filtered = rows.filter((d) => subjectToPathSegment(d.subject) === nb);
        if (filtered.length === 0) {
          if (!cancelled) {
            setGenHint(
              `No hay archivos en el cuaderno «${nb}». Sube material en Mis cuadernos o revisa el nombre de la materia.`,
            );
          }
          return;
        }
        const combined = combineNotebookExtractedTextForPack(filtered);
        if (cancelled) return;
        lastNotebookFromUrl.current = loadKey;
        setFiles(null);
        setLibrarySelection(null);
        setNotebookBundleSlug(nb);
        setNotebookDocCount(filtered.length);
        setExtractedText(combined);
        const first = filtered[0]!;
        setSubjectHint((prev) => (prev.trim() ? prev : first.subject));
        setKitTopic(first.topic ?? "");
        setKitLessonPoint(first.lesson_point ?? "");
        setKitPracticeExercises(first.practice_exercises ?? "");
        setKind("notes");
        setExtractError(null);
        setGenHint(
          `Cuaderno enlazado: ${filtered.length} archivo${filtered.length === 1 ? "" : "s"}. Revisa la vista previa y pulsa «Generar kit de rescate».`,
        );
      } catch {
        if (!cancelled) setGenHint("No pudimos leer tu cuaderno desde Mis cuadernos. ¿Sesión iniciada?");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, authUserId]);

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
    const fromNotebookBundle = Boolean(notebookBundleSlug && notebookDocCount > 0);
    const fromLibrary = librarySelection !== null || fromNotebookBundle;
    const tagSection = buildRescueTagNotesSection(subjectHint, kitTopic, kitLessonPoint, kitPracticeExercises);
    const notesForApi = [tagSection, notes].filter(Boolean).join("\n\n---\n\n");
    // Prioritize real extracted content over pasted notes for the demo hash / fallback pack.
    const seedText = [extractedText, notesForApi, f.seed, link].filter(Boolean).join("\n");

    setGenHint(null);
    if (list.length > 0 && extractBusy) {
      setGenHint("Espera a que termine la extracción del texto del archivo y luego genera el kit.");
      return;
    }
    if (fromLibrary && libraryExtractBusy) {
      setGenHint("Espera a que termine la lectura del archivo desde Mis cuadernos.");
      return;
    }
    if (list.length > 0 && !extractBusy && !extractedText.trim()) {
      setGenHint(
        "No hay texto extraído del archivo todavía (o está vacío). El kit será breve y no inventará temario genérico de la materia.",
      );
    }
    if (fromLibrary && !libraryExtractBusy && !extractedText.trim()) {
      setGenHint("No hay texto extraído del archivo en Mis cuadernos. Revisa permisos o vuelve a subir el archivo allí.");
    }

    const sourceLabel =
      fromLibrary && librarySelection
        ? librarySelection.filename
        : fromNotebookBundle
          ? `Cuaderno (${notebookDocCount} archivos)`
          : f.seed
            ? f.label
            : link.trim()
              ? "enlace"
              : "notas";

    setPackBusy(true);
    setPackError(null);
    try {
      const { pack: nextPack, packError: err } = await postRescuePack(
        {
          subjectHint,
          sourceLabel,
          sourceKind: kind,
          extractedFileText: extractedText,
          notes: notesForApi,
          link,
          uploadedFileCount: librarySelection ? 1 : fromNotebookBundle ? notebookDocCount : list.length,
          seedText: f.seed && !extractedText && !notesForApi && !link ? f.seed : "",
        },
        { seedText, subjectHint, sourceLabel, sourceKind: kind },
      );
      setPack(nextPack);
      setPackError(err);
      setGenHint(null);
    } finally {
      setPackBusy(false);
    }
  }

  async function saveKitToNotebook() {
    if (!authUserId) return;
    if (!isSupabaseConfigured()) {
      setSaveKitMessage("Configura Supabase para guardar en Mis cuadernos.");
      return;
    }
    const sourceText = buildRescueSourceDocumentBody(extractedText, notes, link);
    if (!sourceText.trim()) {
      setSaveKitMessage("No hay material de entrada para guardar: sube o elige archivos, pega apuntes o añade un enlace.");
      return;
    }
    setSaveKitBusy(true);
    setSaveKitMessage(null);
    try {
      await saveRescueNotebookSource({
        authUserId,
        subject: subjectHint.trim() || "General",
        topic: kitTopic,
        lesson_point: kitLessonPoint,
        practice_exercises: kitPracticeExercises,
        sourceText,
      });
      setSaveKitMessage(
        `Guardado el material que usaste para el rescate en el cuaderno «${subjectHint.trim() || "General"}» (no el kit de la IA). Ábrelo en Mis cuadernos o en el lector para completar el cuaderno con esa fuente.`,
      );
    } catch (e) {
      setSaveKitMessage(e instanceof Error ? e.message : "No se pudo guardar el material.");
    } finally {
      setSaveKitBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Mis cuadernos"
        title="Rescate de clase"
        description="Parte de tu cuaderno: recupera clases perdidas con el material que ya guardaste, subida local o todo un cuaderno por materia para generar el kit."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={premium ? "success" : "neutral"}>{premium ? "Premium" : "Gratis"}</Badge>
            <Button type="button" variant="secondary" size="sm" onClick={() => router.push("/study/library")}>
              Mis cuadernos
            </Button>
            <ShareLinkButton
              pathname="/study/library/rescue"
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
            Indica <strong>Materia foco</strong> y las mismas <strong>etiquetas</strong> que en Mis cuadernos (Tema, Punto,
            Ejercicios) antes de generar: la IA las usa para orientar el kit. Si pulsas «Guardar material del rescate»,
            en el cuaderno solo se guarda lo que <strong>entraste</strong> (texto extraído, apuntes, enlace), no el kit
            generado. Puedes subir archivos locales, elegir un archivo de Mis cuadernos, o abrir{" "}
            <code className="rounded bg-white/10 px-1 py-0.5 text-[11px]">/study/library/rescue?notebook=econometria</code> para cargar{" "}
            <strong>todo</strong> el cuaderno.
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

          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 md:col-span-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Etiquetas del rescate (igual que al alimentar el cuaderno)
            </p>
            <p className="mb-3 text-[11px] text-slate-500">
              La <strong className="text-slate-400">Materia foco</strong> define en qué cuaderno aparecerá si pulsas
              «Guardar material en el cuaderno». <strong className="text-slate-400">Tema</strong>, <strong className="text-slate-400">Punto</strong> y{" "}
              <strong className="text-slate-400">Ejercicios prácticos</strong> se guardan en esa hoja y sirven para filtrar el kit de estudio en el lector.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1 text-xs">
                <span className="text-slate-500">Tema</span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm text-slate-200 outline-none ring-indigo-400/30 focus:ring"
                  value={kitTopic}
                  onChange={(e) => setKitTopic(e.target.value)}
                  placeholder="Ej. Números complejos"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-slate-500">Punto</span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm text-slate-200 outline-none ring-indigo-400/30 focus:ring"
                  value={kitLessonPoint}
                  onChange={(e) => setKitLessonPoint(e.target.value)}
                  placeholder="Ej. 2.1 Forma polar"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-slate-500">Ejercicios prácticos</span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm text-slate-200 outline-none ring-indigo-400/30 focus:ring"
                  value={kitPracticeExercises}
                  onChange={(e) => setKitPracticeExercises(e.target.value)}
                  placeholder="Ej. 1–12 pág. 45"
                />
              </label>
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
                if (next && next.length > 0) {
                  setLibrarySelection(null);
                  setNotebookBundleSlug(null);
                  setNotebookDocCount(0);
                  lastNotebookFromUrl.current = "";
                }
                setFiles(next);
              }}
            />
            <div className="text-xs text-slate-500">
              Opcional: sube aquí solo para esta sesión, o usa “Desde mis cuadernos” para archivos que ya guardaste (persisten al recargar).
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
                {libraryExtractBusy ? "Leyendo archivo de Mis cuadernos…" : "Leyendo archivo y extrayendo texto…"}
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
              setNotebookBundleSlug(null);
              setNotebookDocCount(0);
              lastNotebookFromUrl.current = "";
              setFiles(null);
              setExtractedText("");
              setExtractError(null);
              setGenHint(null);
              setPackError(null);
              setKitTopic("");
              setKitLessonPoint("");
              setKitPracticeExercises("");
              setSaveKitMessage(null);
            }}
          >
            Limpiar
          </Button>
          {genHint ? <div className="text-xs text-slate-400">{genHint}</div> : null}
          {packError ? <div className="text-xs text-amber-200">Usamos un kit básico porque falló la IA: {packError}</div> : null}
        </div>
      </Card>

      {pack ? (
        <RescuePackDisplay
          pack={pack}
          premium={premium}
          headerActions={
            <>
              <ShareLinkButton
                pathname="/study/library/rescue"
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
            </>
          }
        />
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

      <Card className="border-emerald-400/20 bg-emerald-500/[0.06]">
        <CardHeader>
          <CardTitle className="text-emerald-100">Guardar material en el cuaderno</CardTitle>
          <CardDescription>
            Guarda en <strong>{subjectHint.trim() || "General"}</strong> solo lo que <strong>alimentó</strong> este rescate:
            texto extraído de archivos, apuntes pegados y enlace (no el kit de la IA). Sirve para completar el cuaderno con
            la fuente que usaste.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-3 px-6 pb-6">
          {!authUserId ? (
            <p className="text-sm text-slate-400">Inicia sesión para guardar el material en tu cuaderno.</p>
          ) : !isSupabaseConfigured() ? (
            <p className="text-sm text-slate-400">Configura Supabase en el proyecto para usar Mis cuadernos.</p>
          ) : (
            <>
              {!hasSaveableRescueSource ? (
                <p className="text-xs text-slate-500">Añade archivos, texto extraído, apuntes o un enlace para poder guardar.</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2"
                  disabled={saveKitBusy || !hasSaveableRescueSource}
                  onClick={() => void saveKitToNotebook()}
                >
                  {saveKitBusy ? "Guardando…" : "Guardar material del rescate"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/study/library")}>
                  Abrir Mis cuadernos
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/study/notebook/${subjectToPathSegment(subjectHint.trim() || "General")}`)}
                >
                  Abrir lector de esta materia
                </Button>
              </div>
              {saveKitMessage ? <p className="text-sm text-emerald-200/90">{saveKitMessage}</p> : null}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
