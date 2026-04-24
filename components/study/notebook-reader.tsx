"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { initialsFromSubject, notebookCoverGradient } from "@/lib/notebooks/cover-styles";
import { subjectToPathSegment } from "@/lib/notebooks/paths";
import { formatNotebookCloudError } from "@/lib/notebooks/storage-errors";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/cn";

type Props = { subjectSlug: string };

export function NotebookReader({ subjectSlug }: Props) {
  const { authUserId } = useKampus();
  const [pages, setPages] = useState<NotebookDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);

  const subjectLabel = pages[0]?.subject ?? subjectSlug.replace(/_/g, " ");

  const { background, spine } = useMemo(() => notebookCoverGradient(subjectLabel), [subjectLabel]);

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
      const filtered = all.filter((d) => subjectToPathSegment(d.subject) === subjectSlug);
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

  const isImage = current?.mime_type.startsWith("image/");
  const isPdf = current?.mime_type.includes("pdf") || current?.filename.toLowerCase().endsWith(".pdf");

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
        description="Navega como en un cuaderno: cada archivo es una clase o sesión, en orden de fecha."
        actions={
          <Link href="/study/library">
            <Button variant="secondary" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver a biblioteca
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
        <p className="text-sm text-slate-400">
          No hay archivos en este cuaderno.{" "}
          <Link href="/study/library" className="text-indigo-300 underline-offset-2 hover:underline">
            Vuelve a la biblioteca
          </Link>{" "}
          y sube material para esta materia.
        </p>
      ) : null}

      {!loading && total > 0 && current ? (
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
                  style={{ background }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-black/30 text-sm font-bold text-white">
                      {initialsFromSubject(subjectLabel)}
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
                  <div className="flex items-center gap-2">
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
                    <p className="text-xs text-slate-500">No hay texto extraído para esta hoja. Puedes volver a subir el archivo en la biblioteca para intentar OCR de nuevo.</p>
                  )}

                  <p className="text-center text-[11px] text-slate-600">Tip: usa las flechas del teclado ← → para pasar de clase.</p>

                  <div className="flex flex-wrap justify-center gap-2 border-t border-white/10 pt-4">
                    <Link
                      href={`/rescue?subject=${encodeURIComponent(subjectLabel)}`}
                      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-white/10"
                    >
                      Ir a rescate con esta materia
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
