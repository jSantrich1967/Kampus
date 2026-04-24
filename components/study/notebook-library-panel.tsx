"use client";

import { BookMarked, BookOpen, ChevronDown, Loader2, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { initialsFromSubject, notebookCoverGradient } from "@/lib/notebooks/cover-styles";
import { sanitizeStorageFilename, subjectToPathSegment } from "@/lib/notebooks/paths";
import { formatNotebookCloudError } from "@/lib/notebooks/storage-errors";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/cn";

const MAX_BYTES = 50 * 1024 * 1024; // aligned with bucket limit in migration (50 MiB)

export function NotebookLibraryPanel() {
  const { profile, authUserId } = useKampus();
  const [subject, setSubject] = useState(profile.subjects[0] ?? "");
  const [customSubject, setCustomSubject] = useState("");
  const [docs, setDocs] = useState<NotebookDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Which subject "notebook" is expanded to show pages (files). */
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  useEffect(() => {
    if (customSubject.trim()) return;
    const first = profile.subjects[0];
    if (first && !subject.trim()) setSubject(first);
  }, [profile.subjects, customSubject, subject]);

  const effectiveSubject = useMemo(() => {
    const c = customSubject.trim();
    if (c) return c;
    return subject.trim() || "General";
  }, [customSubject, subject]);

  /** Cuadernos agrupados por materia (orden: materias del perfil primero, luego alfabético). */
  const notebooksBySubject = useMemo(() => {
    const map = new Map<string, NotebookDocumentRow[]>();
    for (const d of docs) {
      const key = (d.subject || "General").trim() || "General";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    const keys = Array.from(map.keys());
    const rank = (s: string) => {
      const i = profile.subjects.indexOf(s);
      return i === -1 ? 1000 : i;
    };
    keys.sort((a, b) => {
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
      return a.localeCompare(b, "es");
    });
    return keys.map((subjectKey) => ({ subject: subjectKey, pages: map.get(subjectKey)! }));
  }, [docs, profile.subjects]);

  const loadDocs = useCallback(async () => {
    if (!isSupabaseConfigured() || !authUserId) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: qErr } = await supabase
        .from("notebook_documents")
        .select("*")
        .eq("user_id", authUserId)
        .order("created_at", { ascending: false });
      if (qErr) throw qErr;
      setDocs((data as NotebookDocumentRow[]) ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudieron cargar los archivos.";
      setError(formatNotebookCloudError(msg));
    } finally {
      setLoading(false);
    }
  }, [authUserId]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList?.length || !authUserId) return;
    if (!isSupabaseConfigured()) {
      setError("Supabase no está configurado.");
      return;
    }
    setUploading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const segment = subjectToPathSegment(effectiveSubject);

    try {
      for (const file of Array.from(fileList)) {
        if (file.size > MAX_BYTES) {
          throw new Error(`“${file.name}” supera el límite de ${MAX_BYTES / 1024 / 1024} MB.`);
        }

        let extractedText: string | null = null;
        try {
          const fd = new FormData();
          fd.append("files", file);
          const res = await fetch("/api/rescue/extract", { method: "POST", body: fd });
          const json = (await res.json()) as { combinedText?: string; error?: string };
          if (res.ok && json.combinedText?.trim()) {
            extractedText = json.combinedText.trim();
          }
        } catch {
          // Extraction is optional; upload still proceeds
        }

        const safeName = sanitizeStorageFilename(file.name);
        const storagePath = `${authUserId}/${segment}/${crypto.randomUUID()}_${safeName}`;

        const { error: upErr } = await supabase.storage.from("notebooks").upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });
        if (upErr) throw upErr;

        const { error: insErr } = await supabase.from("notebook_documents").insert({
          user_id: authUserId,
          subject: effectiveSubject,
          storage_path: storagePath,
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          extracted_text: extractedText,
        });
        if (insErr) {
          await supabase.storage.from("notebooks").remove([storagePath]);
          throw insErr;
        }
      }
      await loadDocs();
      setExpandedSubject(effectiveSubject);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al subir.";
      setError(formatNotebookCloudError(msg));
    } finally {
      setUploading(false);
    }
  }

  async function removeDoc(doc: NotebookDocumentRow) {
    if (!authUserId) return;
    setError(null);
    const supabase = createSupabaseBrowserClient();
    try {
      const { error: rmErr } = await supabase.storage.from("notebooks").remove([doc.storage_path]);
      if (rmErr) throw rmErr;
      const { error: delErr } = await supabase.from("notebook_documents").delete().eq("id", doc.id).eq("user_id", authUserId);
      if (delErr) throw delErr;
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo borrar.";
      setError(formatNotebookCloudError(msg));
    }
  }

  async function signedDownload(doc: NotebookDocumentRow) {
    const supabase = createSupabaseBrowserClient();
    const { data, error: uErr } = await supabase.storage.from("notebooks").createSignedUrl(doc.storage_path, 3600);
    if (uErr || !data?.signedUrl) {
      setError(formatNotebookCloudError(uErr?.message ?? "No se pudo generar el enlace de descarga."));
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (!isSupabaseConfigured()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-indigo-300" />
            Mis cuadernos por materia
          </CardTitle>
          <CardDescription>
            Configura Supabase en el proyecto para guardar archivos en la nube (misma cuenta que el login).
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!authUserId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-indigo-300" />
            Mis cuadernos por materia
          </CardTitle>
          <CardDescription>Inicia sesión para subir PDFs, imágenes o apuntes y reutilizarlos después (no se pierden al recargar).</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookMarked className="h-5 w-5 text-indigo-300" />
          Mis cuadernos por materia
        </CardTitle>
        <CardDescription>
          Cada materia es un cuaderno con portada propia. Dentro verás las “hojas” (archivos). Todo queda en tu cuenta en la nube.
        </CardDescription>
      </CardHeader>

      <div className="space-y-4 px-6 pb-6">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-slate-400">Materia (desde tu perfil)</span>
            <select
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-200 outline-none ring-indigo-400/40 focus:ring"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              {(profile.subjects.length ? profile.subjects : ["General"]).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-400">Otra materia (opcional)</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="Ej. Econometría II"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-100 ring-1 ring-indigo-400/30 hover:bg-indigo-500/30">
            <Upload className="h-4 w-4" />
            {uploading ? "Subiendo…" : "Subir archivos"}
            <input
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,application/pdf,image/*,text/plain,text/markdown"
              disabled={uploading}
              onChange={(e) => void uploadFiles(e.target.files)}
            />
          </label>
          <Button type="button" variant="secondary" size="sm" onClick={() => void loadDocs()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Actualizar lista
          </Button>
          <Badge tone="neutral">Subiendo al cuaderno: {effectiveSubject}</Badge>
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Tus cuadernos</h3>
          {docs.length === 0 && !loading ? (
            <p className="text-sm text-slate-500">
              Aún no tienes cuadernos. Elige una materia arriba y sube un PDF o una foto: aparecerá como portada con el nombre de esa asignatura.
            </p>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {notebooksBySubject.map(({ subject: subjectName, pages }) => {
              const { background, spine } = notebookCoverGradient(subjectName);
              const initials = initialsFromSubject(subjectName);
              const expanded = expandedSubject === subjectName;
              const lastTouch = pages[0]?.created_at;
              const pageCount = pages.length;

              return (
                <div
                  key={subjectName}
                  className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 shadow-lg shadow-black/20 ring-1 ring-white/5"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedSubject(expanded ? null : subjectName)}
                    className="group relative w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
                  >
                    {/* Lomo del cuaderno */}
                    <div
                      className="absolute bottom-0 left-0 top-0 z-10 w-3 border-r border-black/20 shadow-inner"
                      style={{ background: spine }}
                      aria-hidden
                    />
                    {/* Portada */}
                    <div
                      className="relative min-h-[11rem] pl-5 pr-4 pt-5 pb-4"
                      style={{ background }}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 opacity-[0.12]"
                        style={{
                          backgroundImage:
                            "repeating-linear-gradient(-12deg, transparent, transparent 3px, rgba(255,255,255,0.04) 3px, rgba(255,255,255,0.04) 4px)",
                        }}
                        aria-hidden
                      />
                      <div className="relative flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div
                            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-black/25 text-xl font-bold tracking-tight text-white shadow-inner backdrop-blur-sm"
                            aria-hidden
                          >
                            {initials}
                          </div>
                          <h4 className="mt-4 line-clamp-2 text-lg font-semibold leading-snug text-white drop-shadow-sm">
                            {subjectName}
                          </h4>
                          <p className="mt-1 text-xs font-medium text-white/75">
                            {pageCount === 1 ? "1 hoja" : `${pageCount} hojas`}
                            {lastTouch ? (
                              <>
                                {" · última "}
                                <span suppressHydrationWarning>
                                  {new Date(lastTouch).toLocaleDateString("es")}
                                </span>
                              </>
                            ) : null}
                          </p>
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 shrink-0 text-white/70 transition-transform duration-200",
                            expanded ? "rotate-180" : "group-hover:translate-y-0.5",
                          )}
                          aria-hidden
                        />
                      </div>
                      <p className="relative mt-3 text-[10px] uppercase tracking-[0.2em] text-white/45">Cuaderno</p>
                    </div>
                  </button>

                  <div className="border-t border-white/10 bg-slate-950/70 px-3 py-2">
                    <Link
                      href={`/study/notebook/${subjectToPathSegment(subjectName)}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-400/25 bg-indigo-500/15 px-3 py-2 text-xs font-medium text-indigo-100 hover:bg-indigo-500/25"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Abrir como cuaderno (clases)
                    </Link>
                  </div>

                  {expanded ? (
                    <div className="border-t border-white/10 bg-slate-950/80 px-3 py-3">
                      <p className="mb-2 text-xs text-slate-500">Páginas en este cuaderno</p>
                      <ul className="space-y-2">
                        {pages.map((doc) => (
                          <li
                            key={doc.id}
                            className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-slate-100">{doc.filename}</div>
                                <div className="mt-0.5 text-[11px] text-slate-500">
                                  {(doc.size_bytes / 1024 / 1024).toFixed(2)} MB ·{" "}
                                  <span suppressHydrationWarning>
                                    {new Date(doc.created_at).toLocaleString("es")}
                                  </span>
                                </div>
                                {doc.extracted_text ? (
                                  <details className="mt-2 text-xs text-slate-400">
                                    <summary className="cursor-pointer text-indigo-200/90">Texto extraído</summary>
                                    <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-2 text-[11px] text-slate-300">
                                      {doc.extracted_text.slice(0, 2000)}
                                      {doc.extracted_text.length > 2000 ? "…" : ""}
                                    </pre>
                                  </details>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 gap-2">
                                <Button type="button" size="sm" variant="secondary" onClick={() => void signedDownload(doc)}>
                                  Descargar
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="text-rose-300 hover:bg-rose-500/10"
                                  onClick={() => void removeDoc(doc)}
                                  aria-label={`Eliminar ${doc.filename}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
