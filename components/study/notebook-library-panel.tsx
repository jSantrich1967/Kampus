"use client";

import { BookMarked, BookOpen, ChevronDown, Loader2, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { getNotebookSubjectCover } from "@/components/study/notebook-subject-cover";
import { getNotebookSubjectIcon } from "@/components/study/notebook-subject-icon";
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
  const searchParams = useSearchParams();
  const [subject, setSubject] = useState(profile.subjects[0] ?? "");
  const [customSubject, setCustomSubject] = useState("");
  const [docs, setDocs] = useState<NotebookDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Which subject "notebook" is expanded to show pages (files). */
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  /** Etiquetas aplicadas a cada archivo de la siguiente subida (Materia = selector de arriba). */
  const [uploadTopic, setUploadTopic] = useState("");
  const [uploadLessonPoint, setUploadLessonPoint] = useState("");
  const [uploadPracticeExercises, setUploadPracticeExercises] = useState("");
  const [uploadScheduleId, setUploadScheduleId] = useState<string | null>(null);
  const [uploadClassDate, setUploadClassDate] = useState<string | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editTopic, setEditTopic] = useState("");
  const [editLessonPoint, setEditLessonPoint] = useState("");
  const [editPractice, setEditPractice] = useState("");
  const [savingTags, setSavingTags] = useState(false);

  useEffect(() => {
    if (customSubject.trim()) return;
    const first = profile.subjects[0];
    if (first && !subject.trim()) setSubject(first);
  }, [profile.subjects, customSubject, subject]);

  // Deep link from calendar: /study/library?subject=...&topic=...&lesson=...&practice=...
  useEffect(() => {
    const subj = (searchParams.get("subject") ?? "").trim();
    const topic = (searchParams.get("topic") ?? "").trim();
    const lesson = (searchParams.get("lesson") ?? "").trim();
    const practice = (searchParams.get("practice") ?? "").trim();
    const expand = (searchParams.get("expand") ?? "").trim();
    const scheduleId = (searchParams.get("scheduleId") ?? "").trim();
    const classDate = (searchParams.get("classDate") ?? "").trim();

    if (subj) {
      // Prefer setting a known subject from profile; else use custom.
      if (profile.subjects.includes(subj)) {
        setCustomSubject("");
        setSubject(subj);
      } else {
        setCustomSubject(subj);
      }
      setExpandedSubject(subj);
    }
    if (topic) setUploadTopic(topic);
    if (lesson) setUploadLessonPoint(lesson);
    if (practice) setUploadPracticeExercises(practice);
    if (expand && subj) setExpandedSubject(subj);
    if (scheduleId) setUploadScheduleId(scheduleId);
    if (classDate) setUploadClassDate(classDate);
    // Only re-run when params/profile list changes.
  }, [searchParams, profile.subjects]);

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
    // Beginners UX: make sure the user sees these fields exist.
    // We require at least one of Tema / Punto so filtros in el kit tengan sentido.
    if (!uploadTopic.trim() && !uploadLessonPoint.trim()) {
      setError("Antes de subir, escribe al menos un Tema o un Punto (arriba).");
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
          topic: uploadTopic.trim(),
          lesson_point: uploadLessonPoint.trim(),
          practice_exercises: uploadPracticeExercises.trim(),
          schedule_id: uploadScheduleId,
          class_date: uploadClassDate,
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

  function openTagEditor(doc: NotebookDocumentRow) {
    setEditingDocId(doc.id);
    setEditTopic(doc.topic ?? "");
    setEditLessonPoint(doc.lesson_point ?? "");
    setEditPractice(doc.practice_exercises ?? "");
  }

  function closeTagEditor() {
    setEditingDocId(null);
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
      closeTagEditor();
      await loadDocs();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudieron guardar las etiquetas.";
      setError(formatNotebookCloudError(msg));
    } finally {
      setSavingTags(false);
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
            Cuadernos por materia
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
          Cuadernos por materia
        </CardTitle>
        <CardDescription>
          Cada materia es un cuaderno con portada propia. Dentro verás las “hojas” (archivos). Desde aquí puedes abrir el lector o generar el kit de estudios con todo el cuaderno.
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

        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Etiquetas del material (opcional · se aplican a la próxima subida)
          </p>
          <p className="mb-3 text-[11px] text-slate-500">
            La <strong className="text-slate-400">Materia</strong> es el cuaderno (arriba). Aquí puedes detallar{" "}
            <strong className="text-slate-400">Tema</strong>, <strong className="text-slate-400">Punto</strong> y{" "}
            <strong className="text-slate-400">Ejercicios prácticos</strong> para filtrar el kit de estudio en el lector.
          </p>
          <p className="mb-3 text-[11px] text-slate-600">
            Consejo: escribe al menos <strong className="text-slate-400">Tema</strong> o <strong className="text-slate-400">Punto</strong> antes
            de subir, así luego te aparecerán en los desplegables del kit de estudios.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-xs">
              <span className="text-slate-500">Tema</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm text-slate-200 outline-none ring-indigo-400/30 focus:ring"
                value={uploadTopic}
                onChange={(e) => setUploadTopic(e.target.value)}
                placeholder="Ej. Números complejos"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-slate-500">Punto</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm text-slate-200 outline-none ring-indigo-400/30 focus:ring"
                value={uploadLessonPoint}
                onChange={(e) => setUploadLessonPoint(e.target.value)}
                placeholder="Ej. 2.1 Forma polar"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-slate-500">Ejercicios prácticos</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm text-slate-200 outline-none ring-indigo-400/30 focus:ring"
                value={uploadPracticeExercises}
                onChange={(e) => setUploadPracticeExercises(e.target.value)}
                placeholder="Ej. 1–12 pág. 45"
              />
            </label>
          </div>
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
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tus cuadernos</h3>
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
              const cover = getNotebookSubjectCover(subjectName);

              return (
                <div
                  key={subjectName}
                  className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 shadow-lg shadow-black/20 ring-1 ring-white/5"
                >
                  <div className="relative">
                    {/* Lomo del cuaderno */}
                    <div
                      className="absolute bottom-0 left-0 top-0 z-10 w-3 border-r border-black/20 shadow-inner"
                      style={{ background: spine }}
                      aria-hidden
                    />
                    {/* Portada (ya no es un solo botón: el enlace del cuaderno es visible aquí) */}
                    <div
                      className="relative min-h-[11rem] pl-5 pr-12 pt-5 pb-5"
                      style={{
                        background,
                        backgroundImage: cover ? `linear-gradient(145deg, rgba(0,0,0,0.28), rgba(0,0,0,0.55)), url(${cover.src})` : undefined,
                        backgroundSize: cover ? "cover" : undefined,
                        backgroundPosition: cover ? "center" : undefined,
                      }}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 opacity-[0.12]"
                        style={{
                          backgroundImage:
                            "repeating-linear-gradient(-12deg, transparent, transparent 3px, rgba(255,255,255,0.04) 3px, rgba(255,255,255,0.04) 4px)",
                        }}
                        aria-hidden
                      />
                      <button
                        type="button"
                        onClick={() => setExpandedSubject(expanded ? null : subjectName)}
                        className="absolute right-2 top-2 z-20 rounded-lg p-2 text-white/80 ring-1 ring-white/15 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70"
                        aria-expanded={expanded}
                        aria-label={expanded ? "Ocultar lista de archivos" : "Ver lista de archivos"}
                      >
                        <ChevronDown
                          className={cn("h-5 w-5 transition-transform duration-200", expanded ? "rotate-180" : "")}
                        />
                      </button>
                      <div className="relative flex gap-4 pr-1">
                        <div
                          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-black/30 text-lg font-bold tracking-tight text-white shadow-inner backdrop-blur-sm"
                          aria-hidden
                        >
                          <div className="relative flex items-center justify-center">
                            <span className="relative z-10">{initials}</span>
                            {(() => {
                              const { Icon, label } = getNotebookSubjectIcon(subjectName);
                              return (
                                <Icon
                                  className="absolute -right-2 -top-2 h-6 w-6 text-white/35"
                                  aria-label={label}
                                />
                              );
                            })()}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Cuaderno</p>
                          <h4 className="mt-1 line-clamp-2 text-lg font-semibold leading-snug text-white drop-shadow-sm">
                            {subjectName}
                          </h4>
                          <p className="mt-2 text-xs leading-relaxed text-white/80">
                            {pageCount === 1 ? "1 hoja" : `${pageCount} hojas`}
                            {lastTouch ? (
                              <>
                                {" · última actualización "}
                                <span suppressHydrationWarning>
                                  {new Date(lastTouch).toLocaleDateString("es")}
                                </span>
                              </>
                            ) : null}
                          </p>
                        </div>
                      </div>

                      <div className="relative z-20 mt-5">
                        <Link
                          href={`/study/notebook/${subjectToPathSegment(subjectName)}`}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/30 bg-black/40 px-4 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-black/55 hover:border-white/40"
                        >
                          <BookOpen className="h-4 w-4 shrink-0 opacity-90" />
                          Abrir cuaderno
                        </Link>
                      </div>
                    </div>
                  </div>

                  {expanded ? (
                    <div className="border-t border-white/10 bg-slate-950/80 px-4 py-4">
                      <p className="mb-3 text-xs font-medium text-slate-400">Páginas en este cuaderno</p>
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
                                {(doc.topic ?? "").trim() || (doc.lesson_point ?? "").trim() || (doc.practice_exercises ?? "").trim() ? (
                                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-slate-400">
                                    {(doc.topic ?? "").trim() ? (
                                      <span className="rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-indigo-100">
                                        Tema: {(doc.topic ?? "").trim()}
                                      </span>
                                    ) : null}
                                    {(doc.lesson_point ?? "").trim() ? (
                                      <span className="rounded-md bg-white/10 px-1.5 py-0.5">Punto: {(doc.lesson_point ?? "").trim()}</span>
                                    ) : null}
                                    {(doc.practice_exercises ?? "").trim() ? (
                                      <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-emerald-100">
                                        Ej.: {(doc.practice_exercises ?? "").trim()}
                                      </span>
                                    ) : null}
                                  </div>
                                ) : null}
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
                              <div className="flex shrink-0 flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="ring-1 ring-white/15"
                                  onClick={() => openTagEditor(doc)}
                                >
                                  Etiquetas
                                </Button>
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
                                  <span className="ml-1 hidden sm:inline">Eliminar</span>
                                </Button>
                              </div>
                            </div>
                            {editingDocId === doc.id ? (
                              <div className="mt-3 space-y-3 rounded-xl border border-indigo-400/25 bg-indigo-500/10 p-3">
                                <p className="text-xs font-medium text-indigo-100">Editar Tema, Punto y Ejercicios</p>
                                <div className="grid gap-2 sm:grid-cols-3">
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
                                <div className="flex flex-wrap gap-2">
                                  <Button type="button" size="sm" disabled={savingTags} onClick={() => void saveDocTags(doc.id)}>
                                    {savingTags ? "Guardando…" : "Guardar"}
                                  </Button>
                                  <Button type="button" size="sm" variant="ghost" disabled={savingTags} onClick={closeTagEditor}>
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : null}
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
