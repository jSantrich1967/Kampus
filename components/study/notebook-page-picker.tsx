"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  documentMatchesTagFilters,
  type NotebookTagFilters,
} from "@/lib/notebooks/document-tags";
import { buildNotebookIndexGroups } from "@/lib/notebooks/notebook-index";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import { cn } from "@/lib/cn";

type Props = {
  pages: NotebookDocumentRow[];
  selectedIds: ReadonlySet<string>;
  onSelectedIdsChange: (next: Set<string>) => void;
  /** Highlight the page the user is currently viewing. */
  currentPageId?: string | null;
  /** Optional tag filters — used by «Aplicar etiquetas». */
  tagFilters?: NotebookTagFilters;
  className?: string;
  compact?: boolean;
};

function prettyFilename(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || filename;
}

export function NotebookPagePicker({
  pages,
  selectedIds,
  onSelectedIdsChange,
  currentPageId,
  tagFilters,
  className,
  compact = false,
}: Props) {
  const groups = useMemo(() => buildNotebookIndexGroups(pages), [pages]);
  const selectedCount = pages.filter((p) => selectedIds.has(p.id)).length;

  function toggleId(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedIdsChange(next);
  }

  function selectAll() {
    onSelectedIdsChange(new Set(pages.map((p) => p.id)));
  }

  function selectNone() {
    onSelectedIdsChange(new Set());
  }

  function applyTagFilters() {
    if (!tagFilters) return;
    const matched = pages.filter((p) => documentMatchesTagFilters(p, tagFilters));
    onSelectedIdsChange(new Set(matched.map((p) => p.id)));
  }

  const hasTagFilters = Boolean(
    tagFilters &&
      (tagFilters.topic.trim() || tagFilters.lessonPoint.trim() || tagFilters.practiceExercises.trim()),
  );

  if (pages.length === 0) {
    return (
      <p className={cn("text-xs text-slate-500", className)}>No hay hojas disponibles para seleccionar.</p>
    );
  }

  return (
    <div className={cn("rounded-xl border border-white/10 bg-slate-950/50", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hojas incluidas</p>
          <p className="text-[11px] text-slate-500">
            {selectedCount} de {pages.length} seleccionada{selectedCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" size="sm" variant="ghost" className="h-7 text-[11px]" onClick={selectAll}>
            Todas
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 text-[11px]" onClick={selectNone}>
            Ninguna
          </Button>
          {hasTagFilters ? (
            <Button type="button" size="sm" variant="secondary" className="h-7 text-[11px]" onClick={applyTagFilters}>
              Aplicar etiquetas
            </Button>
          ) : null}
        </div>
      </div>

      <div className={cn("max-h-64 overflow-y-auto divide-y divide-white/5", compact && "max-h-48")}>
        {groups.map((group) => (
          <div key={group.dateKey}>
            <div className="sticky top-0 z-10 bg-slate-950/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {group.dateKey}
            </div>
            {group.items.map(({ page, index0 }) => {
              const checked = selectedIds.has(page.id);
              const isCurrent = currentPageId === page.id;
              const topic = (page.topic ?? "").trim();
              const label = topic || prettyFilename(page.filename);
              return (
                <label
                  key={page.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 px-3 py-2 transition hover:bg-white/[0.04]",
                    checked && "bg-indigo-500/[0.07]",
                    isCurrent && "ring-1 ring-inset ring-indigo-400/25",
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-white/20 bg-slate-900 text-indigo-500 focus:ring-indigo-400/40"
                    checked={checked}
                    onChange={() => toggleId(page.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-slate-100">
                        Hoja {index0 + 1}
                        {isCurrent ? (
                          <span className="ml-1.5 rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-normal text-indigo-200">
                            actual
                          </span>
                        ) : null}
                      </span>
                      <span className="truncate text-[11px] text-slate-400">{page.filename}</span>
                    </span>
                    {label !== page.filename ? (
                      <span className="mt-0.5 block truncate text-[11px] text-slate-500">{label}</span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
