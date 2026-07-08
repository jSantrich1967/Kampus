"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { LibraryClassFeedPanel } from "@/components/study/library-class-feed-panel";
import { LibraryCloudSyncWidget } from "@/components/study/library-cloud-sync-widget";
import { LibraryLuminaTopBar } from "@/components/study/library-lumina-topbar";
import { LibraryNextNotebookPanel } from "@/components/study/library-next-notebook-panel";
import { LibraryQuickUploadModal } from "@/components/study/library-quick-upload-modal";
import {
  NotebookLibraryPanel,
  type LibraryFilter,
  type LibrarySnapshot,
} from "@/components/study/notebook-library-panel";
import { libraryCopy } from "@/lib/i18n/library";
import { navCopy } from "@/lib/i18n/nav";
import { buildCalendarUploadNotebookHref } from "@/lib/study/notebook-insights";
import { buildLibraryFilterCounts } from "@/lib/study/library-filter-counts";
import type { LibraryQuickUploadTarget } from "@/lib/study/library-quick-upload";
import { recentEditedInsights } from "@/lib/study/notebook-sort";
import type { NotebookSortMode } from "@/lib/study/notebook-sort";
import { LibraryRecentStrip } from "@/components/study/library-recent-strip";
import { useClassSchedule } from "@/hooks/use-class-schedule";
import { cn } from "@/lib/cn";

type LibraryViewMode = "notebooks" | "classes";

export function LibraryHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [documentCount, setDocumentCount] = useState(0);
  const [synced, setSynced] = useState(false);
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [sortMode, setSortMode] = useState<NotebookSortMode>("priority");
  const [viewMode, setViewMode] = useState<LibraryViewMode>("notebooks");
  const [snapshot, setSnapshot] = useState<LibrarySnapshot | null>(null);
  const { schedule } = useClassSchedule();
  const [quickUpload, setQuickUpload] = useState<LibraryQuickUploadTarget | null>(null);
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);
  const t = navCopy.es;
  const lib = libraryCopy.es;

  useEffect(() => {
    const subject = searchParams.get("subject")?.trim();
    if (!subject) return;
    const expand = searchParams.get("expand") === "1";
    const scheduleId = searchParams.get("scheduleId");
    const classDate = searchParams.get("classDate");
    if (!expand && !scheduleId) return;

    const href = buildCalendarUploadNotebookHref({
      subject,
      scheduleId,
      classDate,
      topic: searchParams.get("topic"),
      lesson: searchParams.get("lesson"),
    });
    router.replace(href);
  }, [searchParams, router]);

  const handleLibrarySnapshot = useCallback((next: LibrarySnapshot) => {
    setSnapshot(next);
  }, []);

  const recentItems = recentEditedInsights(snapshot?.insights ?? []);
  const filterCounts = buildLibraryFilterCounts(snapshot?.insights ?? []);

  const filters: { id: LibraryFilter; label: string }[] = [
    { id: "all", label: `${lib.filterAll}${lib.filterCount(filterCounts.all)}` },
    { id: "empty", label: `${lib.filterEmpty}${lib.filterCount(filterCounts.empty)}` },
    { id: "unlinked", label: `${lib.filterUnlinked}${lib.filterCount(filterCounts.unlinked)}` },
    { id: "exam", label: `${lib.filterExam}${lib.filterCount(filterCounts.exam)}` },
  ];

  const viewModes: { id: LibraryViewMode; label: string }[] = [
    { id: "notebooks", label: lib.viewNotebooks },
    { id: "classes", label: lib.viewClasses },
  ];

  const sortModes: { id: NotebookSortMode; label: string }[] = [
    { id: "priority", label: lib.sortPriority },
    { id: "recent", label: lib.sortRecent },
    { id: "name", label: lib.sortName },
  ];

  const handleQuickUpload = useCallback((target: LibraryQuickUploadTarget) => {
    setQuickUpload(target);
  }, []);

  const handleUploadSuccess = useCallback(() => {
    setLibraryRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="-mx-4 -mt-2 min-h-[calc(100dvh-6rem)] px-4 py-6 md:-mx-8 md:px-8 md:py-8">
      <LibraryLuminaTopBar search={search} onSearchChange={setSearch} />

      <div className="mb-10">
        <p className="mb-2 text-xs font-bold tracking-[0.2em] text-purple-400 uppercase">{t.groups.learn}</p>
        <h1 className="mb-4 text-4xl font-bold text-white">{t.items.library}</h1>
        <p className="max-w-2xl text-gray-500">
          Cuadernos por materia: sube apuntes, vincula clases del calendario y lanza quiz desde material real.
        </p>
      </div>

      {viewMode === "notebooks" ? (
        <LibraryNextNotebookPanel
          next={snapshot?.next ?? null}
          onCreateNotebook={() => setCreateOpen(true)}
          onQuickUpload={handleQuickUpload}
        />
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {viewModes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition",
              viewMode === mode.id
                ? "bg-indigo-600 text-white"
                : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
            )}
            onClick={() => setViewMode(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {viewMode === "classes" ? (
        <LibraryClassFeedPanel
          notebooks={snapshot?.notebooks ?? []}
          schedule={schedule}
          searchQuery={search}
          onQuickUpload={handleQuickUpload}
        />
      ) : (
        <>
          <LibraryRecentStrip items={recentItems} />
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition",
                    filter === f.id
                      ? "bg-purple-600 text-white"
                      : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
                  )}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 rounded-full border border-white/10 bg-white/5 p-1">
              {sortModes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    sortMode === s.id ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white",
                  )}
                  onClick={() => setSortMode(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <NotebookLibraryPanel
        searchQuery={search}
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
        filter={filter}
        viewMode={viewMode}
        sortMode={sortMode}
        refreshKey={libraryRefreshKey}
        onQuickUpload={handleQuickUpload}
        onLibrarySnapshotChange={handleLibrarySnapshot}
        onStatsChange={(stats) => {
          setDocumentCount(stats.documentCount);
          setSynced(stats.synced);
        }}
      />

      <div className="mt-12">
        <LibraryCloudSyncWidget documentCount={documentCount} synced={synced} />
      </div>

      <LibraryQuickUploadModal
        target={quickUpload}
        onClose={() => setQuickUpload(null)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}
