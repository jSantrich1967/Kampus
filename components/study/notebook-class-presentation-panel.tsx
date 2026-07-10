"use client";

import { Loader2, Presentation, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ClassPresentationViewer } from "@/components/study/class-presentation-viewer";
import { NotebookPagePicker } from "@/components/study/notebook-page-picker";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { combineNotebookExtractedTextForPack, filterDocumentsByIds } from "@/lib/notebooks/document-tags";
import { resolveNotebookDocumentsExtractedTextWithHint } from "@/lib/notebooks/resolve-extracted-text";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import type { ClassPresentation } from "@/lib/schemas/class-presentation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Scope = "page" | "notebook" | "selection";

type Props = {
  pages: NotebookDocumentRow[];
  currentPage: NotebookDocumentRow;
  subjectLabel: string;
  mediaByDocId?: Record<string, string>;
};

export function NotebookClassPresentationPanel({
  pages,
  currentPage,
  subjectLabel,
  mediaByDocId = {},
}: Props) {
  const [scope, setScope] = useState<Scope>("page");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [presentation, setPresentation] = useState<ClassPresentation | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const total = pages.length;

  const sourceDocs = useMemo(() => {
    if (scope === "page") return [currentPage];
    if (scope === "selection") return filterDocumentsByIds(pages, selectedIds);
    return pages;
  }, [scope, pages, currentPage, selectedIds]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const valid = new Set(pages.map((p) => p.id));
      const next = new Set([...prev].filter((id) => valid.has(id)));
      if (next.size === 0 && pages.length > 0) pages.forEach((p) => next.add(p.id));
      return next;
    });
  }, [pages]);

  const generatePresentation = useCallback(async () => {
    if (sourceDocs.length === 0) return;

    setBusy(true);
    setError(null);
    setHint(null);
    setPresentation(null);

    try {
      let resolvedDocs = sourceDocs;
      if (isSupabaseConfigured()) {
        const supabase = createSupabaseBrowserClient();
        const resolved = await resolveNotebookDocumentsExtractedTextWithHint(supabase, sourceDocs);
        resolvedDocs = resolved.docs;
        if (resolved.extractHint) setHint(resolved.extractHint);
      }

      const combined = combineNotebookExtractedTextForPack(resolvedDocs);
      const pageHints = resolvedDocs.map((doc, i) => {
        const pageNumber = pages.findIndex((p) => p.id === doc.id) + 1 || i + 1;
        return {
          pageNumber: pageNumber > 0 ? pageNumber : i + 1,
          filename: doc.filename,
          topic: doc.topic?.trim() || undefined,
          documentId: doc.id,
        };
      });

      const res = await fetch("/api/notebooks/class-presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectHint: subjectLabel.trim() || "Clase",
          extractedFileText: combined,
          pageHints,
        }),
      });

      const json = (await res.json()) as {
        presentation?: ClassPresentation;
        presentationError?: string | null;
        error?: string;
      };

      if (!res.ok && !json.presentation) {
        throw new Error(json.error ?? "No se pudo generar la clase visual.");
      }

      if (json.presentation) {
        setPresentation(json.presentation);
        setViewerOpen(true);
      }
      if (json.presentationError) setError(json.presentationError);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar la clase visual.");
    } finally {
      setBusy(false);
    }
  }, [pages, sourceDocs, subjectLabel]);

  const noSources = sourceDocs.length === 0;

  return (
    <>
      <Card className="border-violet-400/20 bg-violet-500/[0.06]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-violet-100">
            <Presentation className="h-5 w-5 text-violet-300" />
            Clase visual (pizarra)
          </CardTitle>
          <CardDescription>
            Recrea tus hojas como una mini-clase con diapositivas ilustradas, mapas visuales y narración en voz
            natural (OpenAI). Elige qué páginas incluir antes de empezar.
          </CardDescription>
        </CardHeader>
        <div className="space-y-4 px-6 pb-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setScope("page")}
              className={cn(
                "rounded-full px-3 py-1 text-xs ring-1 transition",
                scope === "page" ? "bg-violet-500/25 text-white ring-violet-400/50" : "bg-white/5 text-slate-300 ring-white/10 hover:bg-white/10",
              )}
            >
              Solo esta hoja
            </button>
            <button
              type="button"
              onClick={() => setScope("notebook")}
              className={cn(
                "rounded-full px-3 py-1 text-xs ring-1 transition",
                scope === "notebook" ? "bg-violet-500/25 text-white ring-violet-400/50" : "bg-white/5 text-slate-300 ring-white/10 hover:bg-white/10",
              )}
            >
              Todo el cuaderno ({total})
            </button>
            <button
              type="button"
              onClick={() => {
                setScope("selection");
                setSelectedIds(new Set(pages.map((p) => p.id)));
              }}
              className={cn(
                "rounded-full px-3 py-1 text-xs ring-1 transition",
                scope === "selection" ? "bg-violet-500/25 text-white ring-violet-400/50" : "bg-white/5 text-slate-300 ring-white/10 hover:bg-white/10",
              )}
            >
              Elegir hojas…
            </button>
          </div>

          {scope === "selection" ? (
            <NotebookPagePicker
              pages={pages}
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
              currentPageId={currentPage.id}
              compact
            />
          ) : null}

          <p className="text-xs text-slate-500">
            Se usarán <strong className="text-slate-300">{sourceDocs.length}</strong> hoja
            {sourceDocs.length === 1 ? "" : "s"} para la clase visual.
          </p>

          <Button type="button" className="gap-2" disabled={busy || noSources} onClick={() => void generatePresentation()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Preparando clase…" : "Iniciar clase visual"}
          </Button>

          {hint ? <p className="text-xs text-amber-200">{hint}</p> : null}
          {error ? <p className="text-xs text-amber-200">{error}</p> : null}

          {presentation && !viewerOpen ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => setViewerOpen(true)}>
              Volver a abrir la presentación
            </Button>
          ) : null}
        </div>
      </Card>

      {viewerOpen && presentation ? (
        <ClassPresentationViewer
          presentation={presentation}
          mediaByDocId={mediaByDocId}
          onClose={() => setViewerOpen(false)}
        />
      ) : null}
    </>
  );
}
