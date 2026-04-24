"use client";

import { BookMarked, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { notebookSubjectsMatch } from "@/lib/notebooks/notebook-filter-options";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import { subjectToPathSegment } from "@/lib/notebooks/paths";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Props = {
  subjectFilter: string;
  activeDocId: string | null;
  busy: boolean;
  onPick: (doc: NotebookDocumentRow) => void;
  onClear: () => void;
};

export function RescueNotebookPicker({ subjectFilter, activeDocId, busy, onPick, onClear }: Props) {
  const { authUserId } = useKampus();
  const [docs, setDocs] = useState<NotebookDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured() || !authUserId) return;
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("notebook_documents")
        .select("*")
        .eq("user_id", authUserId)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      setDocs((data as NotebookDocumentRow[]) ?? []);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [authUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = subjectFilter.trim();
    if (!q) return docs;
    const qLower = q.toLowerCase();
    return docs.filter(
      (d) =>
        notebookSubjectsMatch(d.subject, q) ||
        d.subject.toLowerCase().includes(qLower) ||
        d.filename.toLowerCase().includes(qLower),
    );
  }, [docs, subjectFilter]);

  if (!isSupabaseConfigured()) return null;

  if (!authUserId) {
    return (
      <div className="rounded-xl border border-white/10 bg-slate-950/30 px-3 py-3 text-sm text-slate-400">
        <span className="text-slate-500">Mis cuadernos:</span> inicia sesión para elegir archivos guardados por materia.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/5 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-indigo-100">
          <BookMarked className="h-4 w-4 text-indigo-300" />
          Desde mis cuadernos
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="ghost" className="text-xs" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Actualizar
          </Button>
          <Link href="/study/library" className="text-xs text-indigo-200 underline-offset-2 hover:underline">
            Abrir Mis cuadernos
          </Link>
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Usa un archivo que ya subiste en Mis cuadernos. Filtra por la materia foco o el nombre del archivo.
      </p>

      {subjectFilter.trim() ? (
        <div className="mt-2 rounded-lg border border-white/10 bg-slate-950/50 px-2 py-2">
          <p className="text-[11px] text-slate-400">
            ¿Quieres usar <strong>todo</strong> el cuaderno de la materia foco para el kit de estudios?
          </p>
          <Link
            href={`/study/library/rescue?notebook=${subjectToPathSegment(subjectFilter.trim())}&subject=${encodeURIComponent(subjectFilter.trim())}`}
            className="mt-1 inline-flex text-xs font-semibold text-indigo-200 underline-offset-2 hover:underline"
          >
            Cargar cuaderno «{subjectFilter.trim()}» en el kit de estudios →
          </Link>
        </div>
      ) : null}

      {activeDocId ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-emerald-200/90">Archivo de Mis cuadernos seleccionado.</span>
          <Button type="button" size="sm" variant="secondary" className="h-7 text-xs" onClick={onClear} disabled={busy}>
            Quitar selección
          </Button>
        </div>
      ) : null}

      <div className="mt-3 max-h-48 space-y-2 overflow-auto pr-1">
        {filtered.length === 0 && !loading ? (
          <p className="text-xs text-slate-500">No hay archivos en Mis cuadernos (o no coinciden con el filtro).</p>
        ) : null}
        {filtered.map((doc) => (
          <div
            key={doc.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/50 px-2 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-slate-200">{doc.filename}</div>
              <div className="text-[10px] text-slate-500">
                {doc.subject} · {(doc.size_bytes / 1024 / 1024).toFixed(2)} MB
                {doc.extracted_text ? " · texto guardado" : ""}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant={activeDocId === doc.id ? "secondary" : "ghost"}
              className="h-8 shrink-0 text-xs"
              disabled={busy}
              onClick={() => onPick(doc)}
            >
              {activeDocId === doc.id ? "Activo" : "Usar en el kit"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
