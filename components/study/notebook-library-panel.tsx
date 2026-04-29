"use client";

import { BookMarked, BookOpen, ChevronDown, Loader2, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { KampusNotebookCover } from "@/components/brand/kampus-notebook-cover";
import { useKampus } from "@/components/kampus/kampus-provider";
import { getNotebookSubjectCover } from "@/components/study/notebook-subject-cover";
import { getNotebookSubjectIcon } from "@/components/study/notebook-subject-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { initialsFromSubject, notebookCoverGradient } from "@/lib/notebooks/cover-styles";
import { subjectToPathSegment } from "@/lib/notebooks/paths";
import { formatNotebookCloudError } from "@/lib/notebooks/storage-errors";
import { uploadNotebookDocuments } from "@/lib/notebooks/upload-documents";
import type { NotebookDocumentRow, UserNotebookRow } from "@/lib/notebooks/types";
import type { ClassScheduleRow } from "@/lib/schemas/class-schedule";
import { fetchClassScheduleRemote } from "@/lib/supabase/agenda-db";
import { loadClassSchedule } from "@/lib/storage/class-schedule-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/cn";

export function NotebookLibraryPanel() {
  const { profile, authUserId } = useKampus();
  const searchParams = useSearchParams();
  const [subject, setSubject] = useState(profile.subjects[0] ?? "");
  const [customSubject, setCustomSubject] = useState("");
  const [docs, setDocs] = useState<NotebookDocumentRow[]>([]);
  const [notebooks, setNotebooks] = useState<UserNotebookRow[]>([]);
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
  const [uploadAsClass, setUploadAsClass] = useState(false);
  const [scheduleRows, setScheduleRows] = useState<ClassScheduleRow[]>([]);
  const [creatingNotebook, setCreatingNotebook] = useState(false);
  const [newNotebookSubject, setNewNotebookSubject] = useState("");
  const [showAllNotebooks, setShowAllNotebooks] = useState(false);
  const [kitSubject, setKitSubject] = useState("");
  const [deletingNotebook, setDeletingNotebook] = useState<string | null>(null);

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
    if (scheduleId || classDate) setUploadAsClass(true);
    // Only re-run when params/profile list changes.
  }, [searchParams, profile.subjects]);

  const useCloud = Boolean(isSupabaseConfigured() && authUserId);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!hydratedSafe()) return;
      try {
        if (useCloud && authUserId) {
          const supabase = createSupabaseBrowserClient();
          const rows = await fetchClassScheduleRemote(supabase, authUserId);
          if (!cancelled) setScheduleRows(rows);
        } else {
          if (!cancelled) setScheduleRows(loadClassSchedule());
        }
      } catch {
        if (!cancelled) setScheduleRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [useCloud, authUserId]);

  function hydratedSafe() {
    // This component already runs client-side; keep a guard for safety.
    return typeof window !== "undefined";
  }

  const effectiveSubject = useMemo(() => {
    const c = customSubject.trim();
    if (c) return c;
    return subject.trim() || "General";
  }, [customSubject, subject]);

  const effectiveNewNotebookSubject = useMemo(() => {
    const s = newNotebookSubject.trim();
    if (s) return s;
    return subject.trim() || profile.subjects[0] || "General";
  }, [newNotebookSubject, profile.subjects, subject]);

  const canUploadMaterial = useMemo(() => {
    // Hide the upload UI until the user has at least one notebook,
    // except when coming from the calendar (deep link with class metadata).
    return notebooks.length > 0 || docs.length > 0 || Boolean(uploadScheduleId) || Boolean(uploadClassDate);
  }, [docs.length, notebooks.length, uploadClassDate, uploadScheduleId]);

  /** Cuadernos por materia (incluye vacíos creados en user_notebooks). */
  const notebooksBySubject = useMemo(() => {
    const pagesBySubject = new Map<string, NotebookDocumentRow[]>();
    for (const d of docs) {
      const key = (d.subject || "General").trim() || "General";
      if (!pagesBySubject.has(key)) pagesBySubject.set(key, []);
      pagesBySubject.get(key)!.push(d);
    }
    for (const list of pagesBySubject.values()) {
      list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    const subjects = new Set<string>();
    notebooks.forEach((n) => subjects.add((n.subject || "General").trim() || "General"));
    Array.from(pagesBySubject.keys()).forEach((s) => subjects.add(s));
    // Also show profile subjects as "suggested notebooks".
    (profile.subjects.length ? profile.subjects : ["General"]).forEach((s) => subjects.add(s));

    const keys = Array.from(subjects);
    const rank = (s: string) => {
      const i = profile.subjects.indexOf(s);
      return i === -1 ? 1000 : i;
    };
    keys.sort((a, b) => {
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
      return a.localeCompare(b, "es");
    });
    return keys.map((subjectKey) => ({
      subject: subjectKey,
      exists: notebooks.some((n) => (n.subject || "").trim() === subjectKey.trim()),
      pages: pagesBySubject.get(subjectKey) ?? [],
    }));
  }, [docs, notebooks, profile.subjects]);

  const createdNotebooks = useMemo(() => notebooksBySubject.filter((n) => n.exists), [notebooksBySubject]);

  useEffect(() => {
    if (kitSubject.trim()) return;
    const first = createdNotebooks[0]?.subject ?? "";
    if (first) setKitSubject(first);
  }, [createdNotebooks, kitSubject]);

  const kitHref = useMemo(() => {
    const s = kitSubject.trim();
    if (!s) return "/study/library/rescue";
    return `/study/library/rescue?notebook=${subjectToPathSegment(s)}&subject=${encodeURIComponent(s)}`;
  }, [kitSubject]);

  const loadDocs = useCallback(async () => {
    if (!isSupabaseConfigured() || !authUserId) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const [docsRes, nbRes] = await Promise.all([
        supabase.from("notebook_documents").select("*").eq("user_id", authUserId).order("created_at", { ascending: false }),
        supabase.from("user_notebooks").select("*").eq("user_id", authUserId).order("subject", { ascending: true }),
      ]);
      if (docsRes.error) throw docsRes.error;
      if (nbRes.error) throw nbRes.error;
      setDocs((docsRes.data as NotebookDocumentRow[]) ?? []);
      setNotebooks((nbRes.data as UserNotebookRow[]) ?? []);
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
    if (uploadAsClass) {
      const sid = (uploadScheduleId ?? "").trim();
      const cd = (uploadClassDate ?? "").trim();
      if (!sid) {
        setError("Para subir una clase al calendario, primero elige cuál clase del horario es (arriba).");
        return;
      }
      if (!cd) {
        setError("Para subir una clase al calendario, primero elige la fecha de la clase (arriba).");
        return;
      }
    }
    // Beginners UX: make sure the user sees these fields exist.
    // We require at least one of Tema / Punto so filtros in el kit tengan sentido.
    const topicValue = uploadTopic.trim() || (uploadAsClass ? "Clase" : "");
    const pointValue = uploadLessonPoint.trim();
    if (!topicValue && !pointValue) {
      setError("Antes de subir, escribe al menos un Tema o un Punto (arriba).");
      return;
    }
    setUploading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();

    try {
      await uploadNotebookDocuments(supabase, {
        userId: authUserId,
        subject: effectiveSubject,
        files: Array.from(fileList),
        fields: {
          topic: topicValue,
          lesson_point: pointValue,
          practice_exercises: uploadPracticeExercises.trim(),
          schedule_id: uploadAsClass ? uploadScheduleId : null,
          class_date: uploadAsClass ? uploadClassDate : null,
        },
      });
      await loadDocs();
      setExpandedSubject(effectiveSubject);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al subir.";
      setError(formatNotebookCloudError(msg));
    } finally {
      setUploading(false);
    }
  }

  async function createNotebook(subjectName: string) {
    if (!authUserId) return;
    const s = subjectName.trim() || "General";
    setCreatingNotebook(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: insErr } = await supabase.from("user_notebooks").upsert({ user_id: authUserId, subject: s });
      if (insErr) throw insErr;
      setExpandedSubject(s);
      setNewNotebookSubject("");
      await loadDocs();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo crear el cuaderno.";
      setError(formatNotebookCloudError(msg));
    } finally {
      setCreatingNotebook(false);
    }
  }

  async function deleteNotebook(subjectName: string) {
    if (!authUserId) return;
    const s = subjectName.trim() || "General";
    const ok = window.confirm(
      `¿Eliminar el cuaderno “${s}”?\n\nEsto borrará también todos los archivos subidos a ese cuaderno.`,
    );
    if (!ok) return;

    setDeletingNotebook(s);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: qErr } = await supabase
        .from("notebook_documents")
        .select("id,storage_path")
        .eq("user_id", authUserId)
        .eq("subject", s)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (qErr) throw qErr;
      const rows = (data ?? []) as Pick<NotebookDocumentRow, "id" | "storage_path">[];
      const paths = rows.map((r) => r.storage_path).filter(Boolean);

      // Remove files from Storage in chunks (avoid huge requests).
      const chunkSize = 100;
      for (let i = 0; i < paths.length; i += chunkSize) {
        const chunk = paths.slice(i, i + chunkSize);
        const { error: rmErr } = await supabase.storage.from("notebooks").remove(chunk);
        if (rmErr) throw rmErr;
      }

      // Remove DB rows.
      if (rows.length) {
        const { error: delDocsErr } = await supabase.from("notebook_documents").delete().eq("user_id", authUserId).eq("subject", s);
        if (delDocsErr) throw delDocsErr;
      }

      const { error: delNbErr } = await supabase.from("user_notebooks").delete().eq("user_id", authUserId).eq("subject", s);
      if (delNbErr) throw delNbErr;

      // Update local state quickly.
      setDocs((prev) => prev.filter((d) => d.subject !== s));
      setNotebooks((prev) => prev.filter((n) => n.subject !== s));
      if (expandedSubject === s) setExpandedSubject(null);
      if (kitSubject === s) setKitSubject("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo eliminar el cuaderno.";
      setError(formatNotebookCloudError(msg));
    } finally {
      setDeletingNotebook(null);
    }
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
          Cada materia es un cuaderno con portada propia. <strong className="text-slate-200">Aquí</strong> subes material con opción de{" "}
          <strong className="text-slate-200">enlazarlo al calendario</strong> y etiquetas antes de subir. En el{" "}
          <strong className="text-slate-200">lector</strong> la subida es rápida (archivos sueltos); el índice y las etiquetas por archivo se gestionan allí.
        </CardDescription>
      </CardHeader>

      <div className="space-y-4 px-6 pb-6">
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Crear cuaderno</p>
          <p className="mb-3 text-[11px] text-slate-500">
            Un <strong className="text-slate-400">cuaderno</strong> es una materia/asignatura (aunque esté vacío). Luego, cada día subes la clase como
            material dentro de ese cuaderno.
          </p>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm md:col-span-1">
              <span className="text-slate-400">Sugerencias (tu perfil)</span>
              <select
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-200 outline-none ring-indigo-400/40 focus:ring"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setNewNotebookSubject("");
                }}
              >
                {(profile.subjects.length ? profile.subjects : ["General"]).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-slate-400">Nombre de la materia</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-200 outline-none ring-indigo-400/40 focus:ring"
                value={newNotebookSubject}
                onChange={(e) => setNewNotebookSubject(e.target.value)}
                placeholder="Ej. Álgebra lineal"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={creatingNotebook}
              onClick={() => void createNotebook(effectiveNewNotebookSubject)}
            >
              <Plus className="h-4 w-4" />
              {creatingNotebook ? "Creando…" : "Crear cuaderno"}
            </Button>
            <Badge tone="neutral">Se creará: {effectiveNewNotebookSubject}</Badge>
          </div>
        </div>

        {canUploadMaterial ? (
          <>
            <p className="text-[11px] leading-relaxed text-slate-500">
              <strong className="text-slate-300">Subida con contexto:</strong> elige materia, opcionalmente marca si es una clase del calendario y rellena
              Tema/Punto si quieres que el kit de estudios filtre bien. Para añadir PDFs al vuelo mientras lees, usa el lector (
              <strong className="text-slate-400">Agregar (rápido)</strong>).
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-slate-400">Subir material al cuaderno</span>
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
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-200 outline-none ring-indigo-400/40 focus:ring"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Ej. Econometría II"
                />
              </label>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">¿Esto es una clase del calendario?</p>
              <p className="mb-3 text-[11px] text-slate-500">
                Si lo marcas, el material se guarda como <strong className="text-slate-300">Clase</strong> y aparecerá en el día del calendario (requiere
                elegir la clase del horario y su fecha).
              </p>

              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-slate-950/60"
                  checked={uploadAsClass}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setUploadAsClass(v);
                    if (!v) {
                      setUploadScheduleId(null);
                      setUploadClassDate(null);
                    } else {
                      // Default date: today.
                      const today = new Date().toISOString().slice(0, 10);
                      setUploadClassDate((prev) => prev ?? today);
                    }
                  }}
                />
                Sí, es material de una clase
              </label>

              {uploadAsClass ? (
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <label className="space-y-1 text-sm md:col-span-2">
                    <span className="text-slate-400">Clase del horario</span>
                    <select
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-200 outline-none ring-indigo-400/40 focus:ring"
                      value={uploadScheduleId ?? ""}
                      onChange={(e) => {
                        const nextId = e.target.value || null;
                        setUploadScheduleId(nextId);
                        const row = scheduleRows.find((r) => r.id === nextId) ?? null;
                        if (row?.subject) {
                          // Keep notebook subject aligned with the class subject.
                          if (profile.subjects.includes(row.subject)) {
                            setCustomSubject("");
                            setSubject(row.subject);
                          } else {
                            setCustomSubject(row.subject);
                          }
                        }
                      }}
                    >
                      <option value="">Selecciona…</option>
                      {scheduleRows.map((r) => {
                        const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
                        const label = `${r.subject} · ${weekdays[r.weekday] ?? "?"} ${r.startTime}–${r.endTime}`;
                        return (
                          <option key={r.id} value={r.id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                    {scheduleRows.length === 0 ? (
                      <div className="mt-1 text-[11px] text-slate-500">
                        No tienes horario configurado todavía. Ve a <strong className="text-slate-400">Mi calendario</strong> y agrega tu horario semanal.
                      </div>
                    ) : null}
                  </label>

                  <label className="space-y-1 text-sm md:col-span-1">
                    <span className="text-slate-400">Fecha de la clase</span>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-200 outline-none ring-indigo-400/40 focus:ring"
                      value={uploadClassDate ?? ""}
                      onChange={(e) => setUploadClassDate(e.target.value || null)}
                    />
                  </label>
                </div>
              ) : null}
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
          </>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
            Primero crea tu primer cuaderno arriba. Cuando exista, aquí se habilita la subida de material para tus clases.
          </div>
        )}

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Mis cuadernos creados</h3>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowAllNotebooks((v) => !v)} disabled={createdNotebooks.length === 0}>
              {showAllNotebooks ? "Ocultar" : "Ver todos"}
            </Button>
          </div>
          {docs.length === 0 && notebooks.length === 0 && !loading ? (
            <p className="text-sm text-slate-500">
              Aún no tienes cuadernos. Crea uno (aunque esté vacío) y luego ve agregando clases con material.
            </p>
          ) : null}

          {createdNotebooks.length ? (
            <div className="flex gap-3 overflow-auto pb-1">
              {createdNotebooks.slice(0, 6).map((nb) => {
                const classDates = new Set((nb.pages ?? []).map((p) => (p.class_date ?? "").trim()).filter(Boolean));
                const classesCount = classDates.size;
                const filesCount = nb.pages.length;
                return (
                  <Link
                    key={nb.subject}
                    href={`/study/notebook/${subjectToPathSegment(nb.subject)}`}
                    className="relative min-w-[14rem] shrink-0 rounded-2xl border border-white/10 bg-slate-950/50 p-4 transition hover:border-white/20 hover:bg-slate-950/60"
                  >
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-lg p-2 text-rose-200 ring-1 ring-white/10 hover:bg-rose-500/10"
                      aria-label={`Eliminar cuaderno ${nb.subject}`}
                      disabled={Boolean(deletingNotebook)}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void deleteNotebook(nb.subject);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="flex flex-col items-center gap-2">
                      <KampusNotebookCover subject={nb.subject} className="h-28 w-24 shadow-inner shadow-black/20" />
                      <div className="text-center text-xs text-slate-500">
                        {classesCount} clase{classesCount === 1 ? "" : "s"} · {filesCount} archivo{filesCount === 1 ? "" : "s"}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : null}

          {showAllNotebooks ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {notebooksBySubject.map(({ subject: subjectName, pages, exists }) => {
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
                        <div className="grid gap-2">
                          <Link
                            href={`/study/notebook/${subjectToPathSegment(subjectName)}`}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/30 bg-black/40 px-4 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-black/55 hover:border-white/40"
                          >
                            <BookOpen className="h-4 w-4 shrink-0 opacity-90" />
                            Ver cuaderno
                          </Link>
                            {exists ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="w-full text-rose-200 hover:bg-rose-500/10"
                                disabled={Boolean(deletingNotebook)}
                                onClick={() => void deleteNotebook(subjectName)}
                              >
                                {deletingNotebook === subjectName ? "Eliminando…" : "Eliminar cuaderno"}
                              </Button>
                            ) : null}
                          {!exists ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={creatingNotebook}
                              onClick={() => void createNotebook(subjectName)}
                              className="w-full"
                            >
                              <Plus className="h-4 w-4" />
                              Crear cuaderno (vacío)
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  {expanded ? (
                    <div className="border-t border-white/10 bg-slate-950/80 px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resumen del cuaderno</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Para evitar pantallas duplicadas, el <strong className="text-slate-300">índice completo</strong> (clases + páginas) y las acciones
                            por archivo viven en el <strong className="text-slate-300">Lector</strong>.
                          </p>
                        </div>
                        <Link
                          href={`/study/notebook/${subjectToPathSegment(subjectName)}`}
                          className="inline-flex items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-3 py-2 text-xs font-semibold text-indigo-100 hover:bg-indigo-500/25"
                        >
                          Abrir lector (índice + gestión)
                        </Link>
                      </div>

                      {pages.length === 0 ? (
                        <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-slate-400">
                          <div>Este cuaderno está vacío.</div>
                          <div className="text-xs text-slate-500">
                            Puedes subir aquí arriba (sección “Subir archivos”) o abrir el lector y subir directamente allí.
                          </div>
                        </div>
                      ) : (
                        <ul className="mt-3 space-y-2">
                          {(() => {
                            const byDate = new Map<string, NotebookDocumentRow[]>();
                            for (const d of pages) {
                              const key = (d.class_date ?? "").trim() || "Sin fecha";
                              if (!byDate.has(key)) byDate.set(key, []);
                              byDate.get(key)!.push(d);
                            }
                            const keys = Array.from(byDate.keys()).sort((a, b) => (a === "Sin fecha" ? 1 : a.localeCompare(b)));
                            return keys.map((dateKey) => {
                              const list = byDate.get(dateKey)!;
                              return (
                                <li key={dateKey} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
                                  <div className="min-w-0">
                                    <div className="truncate font-medium text-slate-100">
                                      {dateKey === "Sin fecha" ? "Clase (sin fecha)" : `Clase · ${dateKey}`}
                                    </div>
                                    <div className="text-[11px] text-slate-500">{list.length} archivo{list.length === 1 ? "" : "s"}</div>
                                  </div>
                                  <div className="shrink-0 text-[11px] text-slate-500">Ver páginas en el lector</div>
                                </li>
                              );
                            });
                          })()}
                        </ul>
                      )}
                    </div>
                  ) : null}

                  {/* (removed old flat pages list) */}
                </div>
              );
              })}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-indigo-400/25 bg-gradient-to-br from-indigo-500/15 to-slate-950/80 p-4 ring-1 ring-indigo-400/20">
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-100">
            <Sparkles className="h-4 w-4 text-indigo-300" />
            Kit de estudio para examen final
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Selecciona el cuaderno de interés y genera un kit de estudios a partir del material que guardaste.
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-slate-400">Cuaderno de interés</span>
              <select
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-200 outline-none ring-indigo-400/40 focus:ring"
                value={kitSubject}
                onChange={(e) => setKitSubject(e.target.value)}
              >
                <option value="">Selecciona un cuaderno…</option>
                {createdNotebooks.map((n) => (
                  <option key={n.subject} value={n.subject}>
                    {n.subject}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <Link
                href={kitSubject.trim() ? kitHref : "/study/library/rescue"}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold",
                  kitSubject.trim()
                    ? "bg-indigo-500/30 text-indigo-100 ring-1 ring-indigo-400/30 hover:bg-indigo-500/35"
                    : "cursor-not-allowed bg-white/5 text-slate-500 ring-1 ring-white/10",
                )}
                aria-disabled={!kitSubject.trim()}
                onClick={(e) => {
                  if (!kitSubject.trim()) e.preventDefault();
                }}
              >
                <Sparkles className="h-4 w-4" />
                Generar kit
              </Link>
            </div>
          </div>

          {!kitSubject.trim() ? <div className="mt-3 text-xs text-slate-500">Primero selecciona un cuaderno.</div> : null}
        </div>
      </div>
    </Card>
  );
}
