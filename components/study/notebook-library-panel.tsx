"use client";

import { BookMarked, Loader2, MoreVertical, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { KampusNotebookCover } from "@/components/brand/kampus-notebook-cover";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { subjectToPathSegment } from "@/lib/notebooks/paths";
import { formatNotebookCloudError } from "@/lib/notebooks/storage-errors";
import type { NotebookDocumentRow, UserNotebookRow } from "@/lib/notebooks/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function NotebookLibraryPanel() {
  const { profile, authUserId } = useKampus();

  const [docs, setDocs] = useState<NotebookDocumentRow[]>([]);
  const [notebooks, setNotebooks] = useState<UserNotebookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creatingNotebook, setCreatingNotebook] = useState(false);
  const [newNotebookSubject, setNewNotebookSubject] = useState("");
  const [deletingNotebook, setDeletingNotebook] = useState<string | null>(null);
  const [openMenuForSubject, setOpenMenuForSubject] = useState<string | null>(null);

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

  const createdNotebooks = useMemo(() => {
    const pagesBySubject = new Map<string, NotebookDocumentRow[]>();
    for (const d of docs) {
      const key = (d.subject || "General").trim() || "General";
      if (!pagesBySubject.has(key)) pagesBySubject.set(key, []);
      pagesBySubject.get(key)!.push(d);
    }
    const list = notebooks
      .map((n) => (n.subject || "General").trim() || "General")
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "es"));
    return list.map((subjectKey) => ({
      subject: subjectKey,
      pages: pagesBySubject.get(subjectKey) ?? [],
    }));
  }, [docs, notebooks]);

  const loadDocs = useCallback(async () => {
    if (!isSupabaseConfigured() || !authUserId) {
      setLoading(false);
      return;
    }
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
      const msg = e instanceof Error ? e.message : "No se pudieron cargar los cuadernos.";
      setError(formatNotebookCloudError(msg));
    } finally {
      setLoading(false);
    }
  }, [authUserId]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

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
    const ok = window.confirm(`¿Eliminar el cuaderno “${s}”?\n\nEsto borrará también todos los archivos subidos a ese cuaderno.`);
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
        const { error: delDocsErr } = await supabase.from("notebook_documents").delete().eq("user_id", authUserId).eq("subject", s);
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

  if (!isSupabaseConfigured()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-indigo-300" />
            Mis cuadernos
          </CardTitle>
          <CardDescription>
            Configura Supabase en el proyecto para guardar cuadernos en la nube (misma cuenta que el login).
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
            Mis cuadernos
          </CardTitle>
          <CardDescription>Inicia sesión para crear cuadernos y conservarlos (se sincronizan en la nube).</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookMarked className="h-5 w-5 text-indigo-300" />
          Mis cuadernos
        </CardTitle>
        <CardDescription>Crea un cuaderno por materia. Entra al cuaderno para ver el índice y gestionar archivos.</CardDescription>
      </CardHeader>

      <div className="space-y-6 px-6 pb-6">
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
          <div className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">Crear cuaderno</div>
          <label className="space-y-2 text-sm">
            <span className="text-slate-400">Nombre de la materia</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-slate-200 outline-none ring-indigo-400/40 focus:ring"
              value={newNotebookSubject}
              onChange={(e) => setNewNotebookSubject(e.target.value)}
              placeholder={profile.subjects[0] ? `Ej. ${profile.subjects[0]}` : "Ej. Econometría"}
            />
          </label>
          <div className="mt-4">
            <Button type="button" className="w-full gap-2" disabled={creatingNotebook} onClick={() => void createNotebook(effectiveNewNotebookSubject)}>
              <Plus className="h-5 w-5" />
              {creatingNotebook ? "Creando…" : "Crear cuaderno"}
            </Button>
          </div>
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Mis cuadernos</div>

          {loading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando…
            </div>
          ) : null}

          {!loading && createdNotebooks.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
              Aún no tienes cuadernos. Crea el primero arriba.
            </div>
          ) : null}

          <div className="mt-4 grid gap-4">
            {createdNotebooks.map((nb) => {
              const filesCount = nb.pages.length;
              const classDates = new Set((nb.pages ?? []).map((p) => (p.class_date ?? "").trim()).filter(Boolean));
              const classesCount = classDates.size || (filesCount > 0 ? 1 : 0);
              return (
                <Link
                  key={nb.subject}
                  href={`/study/notebook/${subjectToPathSegment(nb.subject)}`}
                  className="group relative flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 transition hover:border-white/20 hover:bg-slate-950/55"
                >
                  <div className="flex items-center gap-4">
                    <KampusNotebookCover subject={nb.subject} className="h-16 w-14 shrink-0 shadow-inner shadow-black/20" />
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-white">{nb.subject}</div>
                      <div className="mt-1 text-sm text-slate-400">
                        {classesCount} clase{classesCount === 1 ? "" : "s"} · {filesCount} archivo{filesCount === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 opacity-70 ring-1 ring-white/10 transition hover:bg-white/5 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 group-hover:opacity-100"
                      aria-label="Menú del cuaderno"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenMenuForSubject((prev) => (prev === nb.subject ? null : nb.subject));
                      }}
                      onPointerDown={(e) => {
                        // Prevent the global pointerdown handler from closing immediately.
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>

                    {openMenuForSubject === nb.subject ? (
                      <div
                        className="absolute right-4 top-14 z-20 w-56 overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/50 ring-1 ring-white/5"
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
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMenuForSubject(null);
                            void deleteNotebook(nb.subject);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar cuaderno
                        </button>
                      </div>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

