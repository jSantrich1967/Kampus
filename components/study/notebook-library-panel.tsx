"use client";

import {
  BookOpen,
  Loader2,
  LogIn,
  MoreVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { KampusNotebookCover } from "@/components/brand/kampus-notebook-cover";
import { useKampus } from "@/components/kampus/kampus-provider";
import { NotebookCardClasses } from "@/components/study/notebook-card-classes";
import { getNotebookSubjectIcon } from "@/components/study/notebook-subject-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  EmptyStateIllustrationNotebook,
  EmptyStatePrimaryCta,
  EmptyStateSecondaryCta,
} from "@/components/ui/empty-state";

import { formatNotebookCloudError } from "@/lib/notebooks/storage-errors";
import type { NotebookDocumentRow, UserNotebookRow } from "@/lib/notebooks/types";
import { libraryCopy } from "@/lib/i18n/library";
import {
  buildNotebookCardInsight,
  buildNotebookCardInsights,
  pickNextNotebook,
  type NotebookCardInsight,
} from "@/lib/study/notebook-insights";
import { buildNotebookClassSummaries } from "@/lib/study/notebook-class-summary";
import {
  notebookMatchesSearch,
  sortNotebookList,
  type NotebookSortMode,
} from "@/lib/study/notebook-sort";
import type { LibraryQuickUploadTarget } from "@/lib/study/library-quick-upload";
import {
  formatShortEdit,
  subjectCategory,
} from "@/lib/study/library-lumina";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type LibraryFilter = "all" | "empty" | "exam" | "unlinked";

export type LibrarySnapshot = {
  notebooks: { subject: string; pages: NotebookDocumentRow[] }[];
  insights: NotebookCardInsight[];
  next: NotebookCardInsight | null;
};

type NotebookLibraryPanelProps = {
  searchQuery?: string;
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
  onStatsChange?: (stats: { documentCount: number; synced: boolean }) => void;
  onLibrarySnapshotChange?: (snapshot: LibrarySnapshot) => void;
  filter?: LibraryFilter;
  viewMode?: "notebooks" | "classes";
  sortMode?: NotebookSortMode;
  refreshKey?: number;
  onQuickUpload?: (target: LibraryQuickUploadTarget) => void;
};

function statusTone(status: NotebookCardInsight["status"]) {
  if (status === "empty") return "danger" as const;
  if (status === "unlinked") return "warning" as const;
  return "success" as const;
}

export function NotebookLibraryPanel({
  searchQuery = "",
  createOpen = false,
  onCreateOpenChange,
  onStatsChange,
  onLibrarySnapshotChange,
  filter = "all",
  viewMode = "notebooks",
  sortMode = "priority",
  refreshKey = 0,
  onQuickUpload,
}: NotebookLibraryPanelProps) {
  const { profile, authUserId } = useKampus();
  const t = libraryCopy.es;

  const [docs, setDocs] = useState<NotebookDocumentRow[]>([]);
  const [notebooks, setNotebooks] = useState<UserNotebookRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [creatingNotebook, setCreatingNotebook] = useState(false);
  const [newNotebookSubject, setNewNotebookSubject] = useState("");
  const [deletingNotebook, setDeletingNotebook] = useState<string | null>(null);
  const [openMenuForSubject, setOpenMenuForSubject] = useState<string | null>(null);
  const [demoBannerDismissed, setDemoBannerDismissed] = useState(false);

  useEffect(() => {
    function onDocPointerDown() {
      setOpenMenuForSubject(null);
    }
    function onDocKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenuForSubject(null);
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, []);

  const effectiveNewNotebookSubject = useMemo(() => {
    const s = newNotebookSubject.trim();
    if (s) return s;
    return profile.subjects[0] || "General";
  }, [newNotebookSubject, profile.subjects]);

  const isDemoList = !authUserId || !isSupabaseConfigured();

  const createdNotebooks = useMemo(() => {
    const pagesBySubject = new Map<string, NotebookDocumentRow[]>();
    for (const d of docs) {
      const key = (d.subject || "General").trim() || "General";
      if (!pagesBySubject.has(key)) pagesBySubject.set(key, []);
      pagesBySubject.get(key)!.push(d);
    }

    let list: string[];
    if (isDemoList) {
      list = [...new Set(profile.subjects.filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
      if (list.length === 0) list = ["General"];
    } else {
      list = notebooks
        .map((n) => (n.subject || "General").trim() || "General")
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "es"));
    }

    return list.map((subjectKey) => ({
      subject: subjectKey,
      pages: pagesBySubject.get(subjectKey) ?? [],
    }));
  }, [docs, notebooks, isDemoList, profile.subjects]);

  const filteredNotebooks = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return createdNotebooks;
    return createdNotebooks.filter((nb) => notebookMatchesSearch(nb, q));
  }, [createdNotebooks, searchQuery]);

  const notebookInsights = useMemo(
    () => buildNotebookCardInsights(filteredNotebooks, profile),
    [filteredNotebooks, profile],
  );

  const insightBySubject = useMemo(
    () => new Map(notebookInsights.map((i) => [i.subject, i])),
    [notebookInsights],
  );

  const displayedNotebooks = useMemo(() => {
    let list = [...filteredNotebooks];
    if (filter === "empty") {
      list = list.filter((nb) => (insightBySubject.get(nb.subject)?.status ?? "empty") === "empty");
    } else if (filter === "exam") {
      list = list.filter((nb) => {
        const days = insightBySubject.get(nb.subject)?.examDays;
        return days !== null && days !== undefined && days <= 14;
      });
    } else if (filter === "unlinked") {
      list = list.filter((nb) => insightBySubject.get(nb.subject)?.status === "unlinked");
    }
    return sortNotebookList(list, sortMode, insightBySubject);
  }, [filteredNotebooks, filter, insightBySubject, sortMode]);

  useEffect(() => {
    const allInsights = buildNotebookCardInsights(createdNotebooks, profile);
    onLibrarySnapshotChange?.({
      notebooks: createdNotebooks,
      insights: allInsights,
      next: pickNextNotebook(allInsights),
    });
  }, [createdNotebooks, profile, onLibrarySnapshotChange]);

  const totalDocuments = useMemo(() => docs.length, [docs]);

  useEffect(() => {
    onStatsChange?.({ documentCount: totalDocuments, synced: Boolean(authUserId && isSupabaseConfigured()) });
  }, [totalDocuments, authUserId, onStatsChange]);

  const loadDocs = useCallback(async () => {
    if (!isSupabaseConfigured() || !authUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const timeoutMs = 8000;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      setLoading(false);
      setError("La carga tardó demasiado. Comprueba tu conexión e inténtalo de nuevo.");
    }, timeoutMs);

    try {
      const supabase = createSupabaseBrowserClient();
      const [docsRes, nbRes] = await Promise.all([
        supabase
          .from("notebook_documents")
          .select("*")
          .eq("user_id", authUserId)
          .order("created_at", { ascending: false }),
        supabase.from("user_notebooks").select("*").eq("user_id", authUserId).order("subject", { ascending: true }),
      ]);
      if (timedOut) return;
      if (docsRes.error) throw docsRes.error;
      if (nbRes.error) throw nbRes.error;
      setDocs((docsRes.data as NotebookDocumentRow[]) ?? []);
      setNotebooks((nbRes.data as UserNotebookRow[]) ?? []);
    } catch (e) {
      if (timedOut) return;
      const msg = e instanceof Error ? e.message : "No se pudieron cargar los cuadernos.";
      setError(formatNotebookCloudError(msg));
    } finally {
      clearTimeout(timeoutId);
      if (!timedOut) setLoading(false);
    }
  }, [authUserId]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs, refreshKey]);

  async function createNotebook(subjectName: string) {
    if (!authUserId) return;
    const s = subjectName.trim() || "General";
    setCreatingNotebook(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: insErr } = await supabase.from("user_notebooks").upsert({ user_id: authUserId, subject: s });
      if (insErr) throw insErr;
      setNewNotebookSubject("");
      onCreateOpenChange?.(false);
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

      const chunkSize = 100;
      for (let i = 0; i < paths.length; i += chunkSize) {
        const chunk = paths.slice(i, i + chunkSize);
        const { error: rmErr } = await supabase.storage.from("notebooks").remove(chunk);
        if (rmErr) throw rmErr;
      }

      if (rows.length) {
        const { error: delDocsErr } = await supabase
          .from("notebook_documents")
          .delete()
          .eq("user_id", authUserId)
          .eq("subject", s);
        if (delDocsErr) throw delDocsErr;
      }

      const { error: delNbErr } = await supabase.from("user_notebooks").delete().eq("user_id", authUserId).eq("subject", s);
      if (delNbErr) throw delNbErr;

      setDocs((prev) => prev.filter((d) => d.subject !== s));
      setNotebooks((prev) => prev.filter((n) => n.subject !== s));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo eliminar el cuaderno.";
      setError(formatNotebookCloudError(msg));
    } finally {
      setDeletingNotebook(null);
    }
  }

  function latestEditIso(pages: NotebookDocumentRow[]): string | undefined {
    return buildNotebookCardInsight("", pages, profile).lastEditIso;
  }

  function openQuickUpload(subject: string) {
    onQuickUpload?.({ subject });
  }

  if (!isSupabaseConfigured() && authUserId) {
    return (
      <div className="kampus-lumina-glass-card rounded-3xl p-8 text-center">
        <p className="text-gray-400">
          Configura Supabase en el proyecto para guardar cuadernos en la nube (misma cuenta que el login).
        </p>
      </div>
    );
  }

  return (
    <>
      {error ? <p className="mb-6 text-sm text-rose-300">{error}</p> : null}

      {isDemoList && !demoBannerDismissed ? (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-cyan-500/25 bg-gradient-to-r from-cyan-500/15 to-blue-500/10 px-4 py-3.5 text-sm text-cyan-100">
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" aria-hidden />
          <p className="flex-1 leading-relaxed">
            <span className="font-semibold text-white">Modo demo:</span> cuadernos de ejemplo según tu perfil.{" "}
            <Link href="/login" className="font-semibold text-cyan-200 underline underline-offset-2 hover:text-white">
              Inicia sesión
            </Link>{" "}
            para crear y sincronizar los tuyos.
          </p>
          <button
            type="button"
            className="shrink-0 rounded-lg p-1 text-cyan-300/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Cerrar aviso de demo"
            onClick={() => setDemoBannerDismissed(true)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="mb-8 flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando cuadernos…
        </div>
      ) : null}

      {viewMode === "notebooks" ? (
      <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        <button
          type="button"
          className="kampus-lumina-glass-card flex min-h-[320px] flex-col items-center justify-center rounded-3xl border-dashed border-white/10"
          onClick={() => onCreateOpenChange?.(true)}
        >
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-gray-400">
            <Plus className="h-8 w-8" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-white">Nuevo cuaderno</h3>
          <p className="text-sm text-gray-500">Crea un nuevo espacio de estudio</p>
        </button>

        {displayedNotebooks.map((nb) => {
          const category = subjectCategory(nb.subject);
          const insight = insightBySubject.get(nb.subject) ?? buildNotebookCardInsight(nb.subject, nb.pages, profile);
          const filesCount = nb.pages.length;
          const lastEdit = insight.lastEditIso ?? latestEditIso(nb.pages);
          const href = insight.href;
          const classSummaries = buildNotebookClassSummaries(nb.pages, nb.subject);
          const { Icon: SubjectIcon } = getNotebookSubjectIcon(nb.subject);

          return (
            <article
              key={nb.subject}
              className="kampus-lumina-glass-card group relative flex min-h-[380px] flex-col overflow-hidden rounded-3xl p-6"
            >
              <div className="relative z-10 flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-purple-400">
                  <SubjectIcon className="h-5 w-5" aria-hidden />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <Badge tone={statusTone(insight.status)}>{insight.statusLabel}</Badge>
                  {insight.examDays !== null && insight.examDays <= 14 ? (
                    <Badge tone={insight.examDays <= 7 ? "danger" : "warning"}>
                      {t.examInDays(insight.examDays)}
                    </Badge>
                  ) : null}
                  {!isDemoList ? (
                    <div className="relative">
                    <button
                      type="button"
                      className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
                      aria-label="Menú del cuaderno"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenMenuForSubject((prev) => (prev === nb.subject ? null : nb.subject));
                      }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>

                    {openMenuForSubject === nb.subject ? (
                      <div
                        className="absolute right-0 top-9 z-20 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#131318]/95 shadow-2xl"
                        role="menu"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-rose-200 hover:bg-rose-500/10 disabled:opacity-60"
                          disabled={Boolean(deletingNotebook)}
                          onClick={() => void deleteNotebook(nb.subject)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar cuaderno
                        </button>
                      </div>
                    ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <h3 className="relative z-10 mt-4 text-2xl font-bold tracking-tight text-white">{nb.subject}</h3>
              <p className="relative z-10 mt-1 text-[11px] font-bold tracking-[0.12em] text-gray-500 uppercase">
                {category.label}
              </p>
              <p className="relative z-10 mt-2 text-sm text-gray-400">
                {filesCount} apunte{filesCount === 1 ? "" : "s"}
                {insight.status === "unlinked" && filesCount > 0 ? (
                  <> · {t.linkedNotes(insight.linkedCount, filesCount)}</>
                ) : null}
                {lastEdit ? (
                  <>
                    {" · "}
                    Editado {formatShortEdit(lastEdit)}
                  </>
                ) : null}
              </p>

              <NotebookCardClasses classes={classSummaries} />

              <KampusNotebookCover
                subject={nb.subject}
                className="pointer-events-none absolute right-4 bottom-[4.5rem] h-32 w-24 rotate-6 shadow-xl shadow-black/30 transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105"
              />

              <div className="relative z-10 mt-auto space-y-2 pt-6">
                <Link
                  href={href}
                  className="flex w-full items-center justify-center rounded-xl bg-white/10 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                >
                  {t.openReader}
                </Link>
                <div className="grid grid-cols-3 gap-2">
                  {onQuickUpload && authUserId && !isDemoList ? (
                    <button
                      type="button"
                      className="flex items-center justify-center rounded-xl border border-white/10 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/5"
                      onClick={() => openQuickUpload(nb.subject)}
                    >
                      {t.quickUpload}
                    </button>
                  ) : (
                    <Link
                      href={insight.uploadHref}
                      className="flex items-center justify-center rounded-xl border border-white/10 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/5"
                    >
                      {t.quickUpload}
                    </Link>
                  )}
                  <Link
                    href={insight.quizHref}
                    className="flex items-center justify-center rounded-xl border border-white/10 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/5"
                  >
                    {t.quickQuiz}
                  </Link>
                  <Link
                    href={insight.kitHref}
                    className="flex items-center justify-center rounded-xl border border-white/10 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/5"
                  >
                    {t.quickKit}
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      ) : null}

      {viewMode === "notebooks" &&
      !loading &&
      createdNotebooks.length > 0 &&
      displayedNotebooks.length === 0 ? (
        <p className="mb-8 rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
          {searchQuery.trim() ? t.searchNoResults : "Ningún cuaderno coincide con este filtro."}
        </p>
      ) : null}

      {viewMode === "notebooks" && !loading && createdNotebooks.length === 0 && !isDemoList ? (
        <EmptyState
          icon={<EmptyStateIllustrationNotebook />}
          title="Tu biblioteca está vacía"
          description="Crea tu primer cuaderno por materia. Luego sube apuntes (PDF/imagen/texto) y Kampus te arma un índice y kits de estudio."
          actions={
            <>
              <EmptyStatePrimaryCta onClick={() => onCreateOpenChange?.(true)}>Crear mi primer cuaderno</EmptyStatePrimaryCta>
              <Link href="/study/library/rescue">
                <EmptyStateSecondaryCta>Probar Rescue (desde un archivo)</EmptyStateSecondaryCta>
              </Link>
            </>
          }
        />
      ) : null}

      {createOpen ? (
        <div className="fixed inset-0 z-[110] flex items-end justify-center p-4 sm:items-center" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Cerrar"
            onClick={() => onCreateOpenChange?.(false)}
          />
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#1b1b20] p-6 shadow-2xl">
            <button
              type="button"
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              aria-label="Cerrar"
              onClick={() => onCreateOpenChange?.(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="mb-2 text-xl font-bold text-white">Nuevo cuaderno</h3>
            <p className="mb-6 text-sm text-gray-400">Un cuaderno por materia. Después podrás subir apuntes en el lector.</p>

            {!authUserId ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">Inicia sesión para crear cuadernos en la nube.</p>
                <Link href="/login">
                  <Button className="w-full gap-2">
                    <LogIn className="h-4 w-4" />
                    Iniciar sesión
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <label className="mb-4 block space-y-2 text-sm">
                  <span className="text-gray-300">Nombre de la materia</span>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-purple-500/80"
                    value={newNotebookSubject}
                    onChange={(e) => setNewNotebookSubject(e.target.value)}
                    placeholder={profile.subjects[0] ? `Ej. ${profile.subjects[0]}` : "Ej. Econometría"}
                  />
                </label>
                <Button
                  type="button"
                  className="w-full gap-2 bg-purple-600 hover:bg-purple-500"
                  disabled={creatingNotebook}
                  onClick={() => void createNotebook(effectiveNewNotebookSubject)}
                >
                  <Plus className="h-5 w-5" />
                  {creatingNotebook ? "Creando…" : "Crear cuaderno"}
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
