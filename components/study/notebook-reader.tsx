"use client";

import { ArrowLeft, BookOpenText, ChevronLeft, ChevronRight, Loader2, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { NotebookStudyKitPanel } from "@/components/study/notebook-study-kit-panel";
import { getNotebookSubjectCover } from "@/components/study/notebook-subject-cover";
import { getNotebookSubjectIcon } from "@/components/study/notebook-subject-icon";
import { Button } from "@/components/ui/button";
import { initialsFromSubject, notebookCoverGradient } from "@/lib/notebooks/cover-styles";
import { generateNotebookBookPdf } from "@/lib/notebooks/book-pdf";
import { buildNotebookIndexGroups } from "@/lib/notebooks/notebook-index";
import { subjectToPathSegment } from "@/lib/notebooks/paths";
import { formatNotebookCloudError } from "@/lib/notebooks/storage-errors";
import { uploadNotebookDocuments } from "@/lib/notebooks/upload-documents";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/cn";

type Props = { subjectSlug: string };

function prettyClassLabelFromFilename(filename: string): string {
  const raw = (filename ?? "").trim();
  if (!raw) return "";
  // Remove last extension: "apuntes_2.pdf" -> "apuntes_2"
  const noExt = raw.replace(/\.[^.]+$/, "");
  // Replace separators with spaces and collapse whitespace.
  const spaced = noExt.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return spaced;
}

function pageRangeLabel(index0List: number[]): string {
  if (!index0List.length) return "";
  const nums = Array.from(new Set(index0List.map((i) => i + 1))).sort((a, b) => a - b);
  if (nums.length === 1) return String(nums[0]);
  // Most common: a contiguous block => show "1–3".
  const first = nums[0]!;
  const last = nums[nums.length - 1]!;
  const isContiguous = nums.every((n, idx) => idx === 0 || n === nums[idx - 1]! + 1);
  if (isContiguous) return `${first}–${last}`;
  // Fallback: show up to 3 items, then "+N".
  const head = nums.slice(0, 3).join(", ");
  if (nums.length <= 3) return head;
  return `${head} +${nums.length - 3}`;
}

export function NotebookReader({ subjectSlug }: Props) {
  const { authUserId } = useKampus();
  const [pages, setPages] = useState<NotebookDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [indexOpen, setIndexOpen] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [bookBusy, setBookBusy] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [editTopic, setEditTopic] = useState("");
  const [editLessonPoint, setEditLessonPoint] = useState("");
  const [editPractice, setEditPractice] = useState("");
  const [savingTags, setSavingTags] = useState(false);

  const subjectLabel =
    pages[0]?.subject ?? (subjectSlug && subjectSlug.length > 0 ? subjectSlug.replace(/_/g, " ") : "Cuaderno");

  const uploadSubject = useMemo(() => {
    const fromPages = (pages[0]?.subject ?? "").trim();
    if (fromPages) return fromPages;
    const slug = (subjectSlug ?? "").trim();
    if (!slug) return "General";
    return slug.replace(/_/g, " ");
  }, [pages, subjectSlug]);

  const { background, spine } = useMemo(() => notebookCoverGradient(subjectLabel), [subjectLabel]);
  const cover = useMemo(() => getNotebookSubjectCover(subjectLabel), [subjectLabel]);
  const headerStyle = useMemo(() => {
    if (!cover) return { background };
    return {
      background,
      backgroundImage: `linear-gradient(145deg, rgba(0,0,0,0.28), rgba(0,0,0,0.55)), url(${cover.src})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    } as const;
  }, [background, cover]);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured() || !authUserId) {
      setPages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: qErr } = await supabase
        .from("notebook_documents")
        .select("*")
        .eq("user_id", authUserId)
        .order("created_at", { ascending: true });
      if (qErr) throw qErr;
      const all = (data as NotebookDocumentRow[]) ?? [];
      const slug = (subjectSlug ?? "").trim();
      const filtered = slug ? all.filter((d) => subjectToPathSegment(d.subject) === slug) : [];
      setPages(filtered);
      setPageIndex(0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo cargar el cuaderno.";
      setError(formatNotebookCloudError(msg));
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, [authUserId, subjectSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = pages[pageIndex] ?? null;
  const total = pages.length;
  const sessionNum = total > 0 ? pageIndex + 1 : 0;

  const indexGroups = useMemo(() => buildNotebookIndexGroups(pages), [pages]);

  useEffect(() => {
    if (!current) {
      setTagOpen(false);
      return;
    }
    setEditTopic(current.topic ?? "");
    setEditLessonPoint(current.lesson_point ?? "");
    setEditPractice(current.practice_exercises ?? "");
    setTagOpen(false);
  }, [current]);

  async function uploadMoreFiles(fileList: FileList | null) {
    if (!fileList?.length || !authUserId) return;
    if (!isSupabaseConfigured()) {
      setError("Supabase no está configurado.");
      return;
    }

    const subject = uploadSubject.trim() || "General";
    setUploading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();

    try {
      await uploadNotebookDocuments(supabase, {
        userId: authUserId,
        subject,
        files: Array.from(fileList),
        fields: {
          topic: "",
          lesson_point: "",
          practice_exercises: "",
          schedule_id: null,
          class_date: null,
        },
      });

      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al subir.";
      setError(formatNotebookCloudError(msg));
    } finally {
      setUploading(false);
    }
  }

  async function signedDownload(doc: NotebookDocumentRow) {
    if (!authUserId) return;
    const supabase = createSupabaseBrowserClient();
    const { data, error: uErr } = await supabase.storage.from("notebooks").createSignedUrl(doc.storage_path, 3600);
    if (uErr || !data?.signedUrl) {
      setError(formatNotebookCloudError(uErr?.message ?? "No se pudo generar el enlace de descarga."));
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function downloadNotebookBookPdf() {
    if (bookBusy) return;
    setBookBusy(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const blob = await generateNotebookBookPdf({
        subjectLabel,
        pages,
        resolveImageBlob: async (page) => {
          if (!authUserId) return null;
          const { data, error: uErr } = await supabase.storage.from("notebooks").createSignedUrl(page.storage_path, 3600);
          if (uErr || !data?.signedUrl) return null;
          const res = await fetch(data.signedUrl);
          if (!res.ok) return null;
          return await res.blob();
        },
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(subjectLabel || "cuaderno").replace(/[\\/:*?\"<>|]+/g, " ").trim()}_libro.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo generar el PDF.";
      setError(formatNotebookCloudError(msg));
    } finally {
      setBookBusy(false);
    }
  }

  async function removeDoc(doc: NotebookDocumentRow) {
    if (!authUserId) return;
    const ok = window.confirm(`¿Eliminar “${doc.filename}”?\n\nEsto también borrará el archivo de la nube.`);
    if (!ok) return;

    setError(null);
    const supabase = createSupabaseBrowserClient();
    try {
      const { error: rmErr } = await supabase.storage.from("notebooks").remove([doc.storage_path]);
      if (rmErr) throw rmErr;
      const { error: delErr } = await supabase.from("notebook_documents").delete().eq("id", doc.id).eq("user_id", authUserId);
      if (delErr) throw delErr;

      setPages((prev) => {
        const idx = prev.findIndex((p) => p.id === doc.id);
        const next = prev.filter((p) => p.id !== doc.id);
        setPageIndex((i) => {
          if (next.length === 0) return 0;
          if (idx >= 0 && i > idx) return Math.max(0, i - 1);
          return Math.min(i, next.length - 1);
        });
        return next;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo borrar.";
      setError(formatNotebookCloudError(msg));
    }
  }

  async function saveDocTags(docId: string) {
    if (!authUserId) return;
    setSavingTags(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: upErr } = await supabase
        .from("notebook_documents")
        .update({
          topic: editTopic.trim(),
          lesson_point: editLessonPoint.trim(),
          practice_exercises: editPractice.trim(),
        })
        .eq("id", docId)
        .eq("user_id", authUserId);
      if (upErr) throw upErr;

      setPages((prev) =>
        prev.map((p) =>
          p.id === docId
            ? {
                ...p,
                topic: editTopic.trim(),
                lesson_point: editLessonPoint.trim(),
                practice_exercises: editPractice.trim(),
              }
            : p,
        ),
      );
      setTagOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudieron guardar las etiquetas.";
      setError(formatNotebookCloudError(msg));
    } finally {
      setSavingTags(false);
    }
  }

  useEffect(() => {
    if (!current || !authUserId) {
      setMediaUrl(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setMediaBusy(true);
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error: uErr } = await supabase.storage.from("notebooks").createSignedUrl(current.storage_path, 3600);
        if (uErr || !data?.signedUrl) throw new Error(uErr?.message ?? "Sin enlace al archivo");
        if (!cancelled) setMediaUrl(data.signedUrl);
      } catch {
        if (!cancelled) setMediaUrl(null);
      } finally {
        if (!cancelled) setMediaBusy(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [current, authUserId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setPageIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setPageIndex((i) => Math.min(total - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  const isImage = Boolean(current?.mime_type?.startsWith("image/"));
  const isPdf =
    Boolean(current?.mime_type?.includes("pdf")) || Boolean(current?.filename?.toLowerCase().endsWith(".pdf"));

  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Cuaderno" title="Lector" description="Configura Supabase para abrir tus cuadernos." />
        <p className="text-sm text-slate-400">Supabase no está configurado en esta instalación.</p>
      </div>
    );
  }

  if (!authUserId) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Cuaderno" title="Lector" description="Inicia sesión para abrir tus materiales." />
        <Link href="/login">
          <Button>Ir a iniciar sesión</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cuaderno"
        title={loading ? "Abriendo…" : subjectLabel}
        description="Navega como en un cuaderno: cada archivo es una hoja. Aquí puedes hacer subida rápida de archivos y editar etiquetas; para vincular material a una clase del horario y fechas del calendario, usa Mis cuadernos."
        actions={
          <Link href="/study/library">
            <Button variant="secondary" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver a mis cuadernos
            </Button>
          </Link>
        }
      />

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando hojas del cuaderno…
        </div>
      ) : null}

      {!loading && total === 0 ? (
        <div className="mx-auto max-w-2xl space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-sm text-slate-300">
          <p className="font-medium text-slate-100">Este cuaderno está vacío</p>
          <p className="text-xs text-slate-400">
            <strong className="text-slate-200">Subida rápida:</strong> los archivos entran sin enlace al calendario. Luego puedes usar{" "}
            <strong className="text-slate-200">Etiquetas</strong> y el <strong className="text-slate-200">Índice</strong>. Si necesitas que el material
            quede en un día concreto del calendario, sube desde <strong className="text-slate-200">Mis cuadernos</strong> marcando “clase del
            calendario”.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-100 ring-1 ring-indigo-400/30 hover:bg-indigo-500/30"
              title="Subida rápida (sin horario ni fecha de clase). Para calendario, usa Mis cuadernos."
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Subiendo…" : "Subir primeros archivos"}
              <input
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,application/pdf,image/*,text/plain,text/markdown"
                disabled={uploading}
                onChange={(e) => void uploadMoreFiles(e.target.files)}
              />
            </label>
            <Link href="/study/library" className="text-xs text-indigo-200 underline-offset-2 hover:underline">
              Mis cuadernos — subir enlazado al calendario
            </Link>
          </div>
        </div>
      ) : null}

      {!loading && total > 0 && current ? (
        <>
          <div className="mx-auto max-w-5xl">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 shadow-lg shadow-black/20 ring-1 ring-white/5">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                onClick={() => setIndexOpen((v) => !v)}
                aria-expanded={indexOpen}
              >
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Índice del cuaderno</div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    Clases (fechas) y sus páginas. Haz clic para navegar.
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  {indexOpen ? "Ocultar" : "Mostrar"} · {total} página{total === 1 ? "" : "s"}
                </div>
              </button>

              {indexOpen ? (
                <div className="border-t border-white/10 px-4 py-4">
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
                    <div className="grid grid-cols-[1.1fr_1.6fr_0.6fr] gap-3 border-b border-white/10 px-4 py-3 text-xs font-semibold text-slate-400">
                      <div>Fecha</div>
                      <div>Clase</div>
                      <div className="text-right">Páginas</div>
                    </div>
                    <div className="divide-y divide-white/10">
                      {indexGroups.map((g) => {
                        const first = g.items[0]?.page ?? null;
                        const rawTitle = (first?.topic ?? "").trim();
                        const fileLabel = prettyClassLabelFromFilename((first?.filename ?? "").trim());
                        const classTitle = rawTitle || fileLabel || "Clase";
                        const pagesLabel = pageRangeLabel(g.items.map((it) => it.index0));
                        const isCurrentGroup = g.items.some((it) => it.index0 === pageIndex);
                        return (
                          <button
                            key={g.dateKey}
                            type="button"
                            onClick={() => setPageIndex(g.items[0]?.index0 ?? 0)}
                            className={cn(
                              "grid w-full grid-cols-[1.1fr_1.6fr_0.6fr] items-center gap-3 px-4 py-4 text-left text-sm transition",
                              isCurrentGroup ? "bg-indigo-500/10" : "hover:bg-white/5",
                            )}
                          >
                            <div className="font-medium text-white">{g.dateKey}</div>
                            <div className="truncate text-slate-200">{classTitle}</div>
                            <div className="text-right font-medium text-slate-200">{pagesLabel}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mx-auto max-w-5xl">
            {/* Marco tipo cuaderno */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 shadow-2xl shadow-black/40 ring-1 ring-white/5">
              <div className="flex min-h-[520px] flex-col md:flex-row">
                {/* Lomo */}
                <div
                  className="hidden w-4 shrink-0 border-r border-black/30 md:block"
                  style={{ background: spine }}
                  aria-hidden
                />
                {/* Contenido */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3"
                    style={headerStyle}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-black/30 text-sm font-bold text-white">
                        <div className="relative flex items-center justify-center">
                          <span className="relative z-10">{initialsFromSubject(subjectLabel)}</span>
                          {(() => {
                            const { Icon, label } = getNotebookSubjectIcon(subjectLabel);
                            return <Icon className="absolute -right-1.5 -top-1.5 h-5 w-5 text-white/40" aria-label={label} />;
                          })()}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-white/60">Clase / sesión</p>
                        <p className="font-semibold text-white">
                          {sessionNum} de {total}
                          <span className="ml-2 font-normal text-white/70">
                            ·{" "}
                            <span suppressHydrationWarning>
                              {new Date(current.created_at).toLocaleString("es", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </span>
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <label
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-500/20 px-3 py-2 text-xs font-semibold text-indigo-100 ring-1 ring-indigo-400/30 hover:bg-indigo-500/30"
                        title="Subida rápida: sin clase del horario. Calendario → Mis cuadernos."
                      >
                        <Upload className="h-4 w-4" />
                        {uploading ? "Subiendo…" : "Agregar (rápido)"}
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,application/pdf,image/*,text/plain,text/markdown"
                          disabled={uploading}
                          onChange={(e) => void uploadMoreFiles(e.target.files)}
                        />
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={bookBusy || pages.length === 0}
                        onClick={() => void downloadNotebookBookPdf()}
                        title="Compila el texto extraído del cuaderno y lo descarga como un solo PDF."
                      >
                        <BookOpenText className="h-4 w-4" />
                        {bookBusy ? "Generando…" : "Libro (PDF)"}
                      </Button>
                      <Button type="button" size="sm" variant="secondary" disabled={!current} onClick={() => void signedDownload(current)}>
                        Descargar
                      </Button>
                      <Button type="button" size="sm" variant="secondary" disabled={!current} onClick={() => setTagOpen((v) => !v)}>
                        Etiquetas
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-rose-200 hover:bg-rose-500/10"
                        disabled={!current}
                        onClick={() => void removeDoc(current)}
                        aria-label="Eliminar hoja"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={pageIndex <= 0}
                        onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                        aria-label="Página anterior"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={pageIndex >= total - 1}
                        onClick={() => setPageIndex((i) => Math.min(total - 1, i + 1))}
                        aria-label="Página siguiente"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
                  {tagOpen ? (
                    <div className="rounded-xl border border-indigo-400/25 bg-indigo-500/10 p-3">
                      <p className="text-xs font-medium text-indigo-100">Editar Tema, Punto y Ejercicios</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <label className="space-y-1 text-[11px]">
                          <span className="text-slate-500">Tema</span>
                          <input
                            className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-1.5 text-xs text-slate-200 outline-none focus:ring focus:ring-indigo-400/30"
                            value={editTopic}
                            onChange={(e) => setEditTopic(e.target.value)}
                          />
                        </label>
                        <label className="space-y-1 text-[11px]">
                          <span className="text-slate-500">Punto</span>
                          <input
                            className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-1.5 text-xs text-slate-200 outline-none focus:ring focus:ring-indigo-400/30"
                            value={editLessonPoint}
                            onChange={(e) => setEditLessonPoint(e.target.value)}
                          />
                        </label>
                        <label className="space-y-1 text-[11px]">
                          <span className="text-slate-500">Ejercicios prácticos</span>
                          <input
                            className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-1.5 text-xs text-slate-200 outline-none focus:ring focus:ring-indigo-400/30"
                            value={editPractice}
                            onChange={(e) => setEditPractice(e.target.value)}
                          />
                        </label>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="secondary" disabled={savingTags || !current} onClick={() => void saveDocTags(current.id)}>
                          Guardar
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setTagOpen(false)}>
                          Cerrar
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <p className="text-xs text-slate-500">Archivo</p>
                    <p className="truncate text-sm font-medium text-slate-100">{current.filename}</p>
                  </div>

                  <div className="min-h-[280px] flex-1 overflow-hidden rounded-xl border border-amber-900/20 bg-amber-50/[0.04]">
                    {mediaBusy ? (
                      <div className="flex h-64 items-center justify-center text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : mediaUrl && isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element -- signed URL from user storage
                      <img src={mediaUrl} alt={current.filename} className="max-h-[480px] w-full object-contain" />
                    ) : mediaUrl && isPdf ? (
                      <iframe title={current.filename} src={mediaUrl} className="h-[min(70vh,560px)] w-full bg-slate-900" />
                    ) : mediaUrl ? (
                      <div className="p-4 text-center text-sm text-slate-400">
                        <a href={mediaUrl} target="_blank" rel="noreferrer" className="text-indigo-300 underline">
                          Abrir archivo en pestaña nueva
                        </a>
                      </div>
                    ) : (
                      <div className="flex h-48 items-center justify-center px-4 text-center text-sm text-slate-500">
                        Vista previa no disponible. Usa el texto extraído abajo o abre el archivo.
                      </div>
                    )}
                  </div>

                  {current.extracted_text ? (
                    <div
                      className={cn(
                        "rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3",
                        "bg-[linear-gradient(transparent_1.45rem,rgba(148,163,184,0.12)_1px)] bg-[length:100%_1.5rem]",
                      )}
                    >
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Apuntes (texto extraído)</p>
                      <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-sans text-sm leading-[1.5rem] text-slate-200">
                        {current.extracted_text}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      No hay texto extraído para esta hoja. Puedes usar <strong className="text-slate-300">Agregar</strong> arriba para volver a subir el
                      archivo y reintentar OCR.
                    </p>
                  )}

                  <p className="text-center text-[11px] text-slate-600">Tip: usa las flechas del teclado ← → para pasar de clase.</p>

                  <div className="flex flex-wrap justify-center gap-2 border-t border-white/10 pt-4">
                    <Link
                      href={`/study/library/rescue?subject=${encodeURIComponent(subjectLabel)}&notebook=${encodeURIComponent(subjectSlug)}`}
                      className="inline-flex items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/25"
                    >
                      Kit de estudios con todo este cuaderno
                    </Link>
                    <Link
                      href={`/study/library/rescue?subject=${encodeURIComponent(subjectLabel)}`}
                      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-white/10"
                    >
                      Solo materia foco en el kit
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>

          <NotebookStudyKitPanel
            pages={pages}
            currentPage={current}
            subjectLabel={subjectLabel}
            subjectSlug={subjectSlug}
          />
        </>
      ) : null}
    </div>
  );
}
