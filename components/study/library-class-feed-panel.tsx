"use client";

import { BookOpen, CalendarClock, Link2, Upload, Zap } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { libraryCopy } from "@/lib/i18n/library";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import type { ClassScheduleRow } from "@/lib/schemas/class-schedule";
import {
  buildLibraryClassFeed,
  filterClassFeedBySearch,
  type LibraryClassFeedItem,
} from "@/lib/study/library-class-feed";
import type { LibraryQuickUploadTarget } from "@/lib/study/library-quick-upload";

type LibraryClassFeedPanelProps = {
  notebooks: { subject: string; pages: NotebookDocumentRow[] }[];
  schedule?: ClassScheduleRow[];
  searchQuery?: string;
  onQuickUpload?: (target: LibraryQuickUploadTarget) => void;
};

function statusTone(status: LibraryClassFeedItem["status"]) {
  if (status === "missing") return "danger" as const;
  if (status === "unlinked") return "warning" as const;
  return "success" as const;
}

function statusLabel(status: LibraryClassFeedItem["status"], t: (typeof libraryCopy)["es"]) {
  if (status === "missing") return t.classFeedMissing;
  if (status === "unlinked") return t.classFeedUnlinked;
  return t.classFeedReady;
}

export function LibraryClassFeedPanel({
  notebooks,
  schedule = [],
  searchQuery = "",
  onQuickUpload,
}: LibraryClassFeedPanelProps) {
  const t = libraryCopy.es;

  function uploadTargetForItem(item: LibraryClassFeedItem): LibraryQuickUploadTarget {
    return {
      subject: item.subject,
      classDate: item.classDate,
      scheduleId: item.scheduleId ?? null,
      topic: item.topic ?? (item.status === "missing" ? "Clase" : ""),
      sessionLabel: item.label,
    };
  }

  const items = useMemo(() => {
    const feed = buildLibraryClassFeed(notebooks, { schedule });
    return filterClassFeedBySearch(feed, searchQuery);
  }, [notebooks, schedule, searchQuery]);

  return (
    <Card className="mb-8 border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarClock className="h-5 w-5 text-sky-300" aria-hidden />
          {t.classFeedTitle}
        </CardTitle>
        <CardDescription>{t.classFeedHint}</CardDescription>
      </CardHeader>

      <div className="space-y-2 px-6 pb-6">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">{t.classFeedEmpty}</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-white">{item.subject}</span>
                  <Badge tone={statusTone(item.status)}>{statusLabel(item.status, t)}</Badge>
                  {item.pageCount > 0 ? (
                    <Badge tone="neutral">{item.pageCount} pág.</Badge>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-sm text-slate-300">{item.label}</p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {item.status === "missing" ? (
                  onQuickUpload ? (
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => onQuickUpload(uploadTargetForItem(item))}
                    >
                      <Upload className="h-3.5 w-3.5" aria-hidden />
                      {t.classFeedUploadCta}
                    </Button>
                  ) : (
                    <Link href={item.uploadHref}>
                      <Button size="sm" className="gap-1.5">
                        <Upload className="h-3.5 w-3.5" aria-hidden />
                        {t.classFeedUploadCta}
                      </Button>
                    </Link>
                  )
                ) : item.status === "unlinked" ? (
                  <Link href={item.openHref}>
                    <Button size="sm" variant="secondary" className="gap-1.5">
                      <Link2 className="h-3.5 w-3.5" aria-hidden />
                      {t.openReader}
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href={item.openHref}>
                      <Button size="sm" variant="secondary" className="gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" aria-hidden />
                        {t.openReader}
                      </Button>
                    </Link>
                    <Link href={item.quizHref}>
                      <Button size="sm" variant="ghost" className="gap-1.5">
                        <Zap className="h-3.5 w-3.5" aria-hidden />
                        {t.quickQuiz}
                      </Button>
                    </Link>
                    <Link href={`${item.openHref.split("?")[0]}?kit=1`}>
                      <Button size="sm" variant="ghost" className="gap-1.5">
                        {t.quickKit}
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
