"use client";

import { ArrowRight, BookOpen, Upload } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { libraryCopy } from "@/lib/i18n/library";
import type { NotebookCardInsight } from "@/lib/study/notebook-insights";
import type { LibraryQuickUploadTarget } from "@/lib/study/library-quick-upload";
import { cn } from "@/lib/cn";

type LibraryNextNotebookPanelProps = {
  next: NotebookCardInsight | null;
  onCreateNotebook?: () => void;
  onQuickUpload?: (target: LibraryQuickUploadTarget) => void;
};

function statusTone(status: NotebookCardInsight["status"]) {
  if (status === "empty") return "danger" as const;
  if (status === "unlinked") return "warning" as const;
  return "success" as const;
}

export function LibraryNextNotebookPanel({
  next,
  onCreateNotebook,
  onQuickUpload,
}: LibraryNextNotebookPanelProps) {
  const t = libraryCopy.es;

  if (!next) {
    return (
      <Card className="mb-8 border-purple-500/25 bg-gradient-to-br from-purple-500/10 to-transparent">
        <CardHeader>
          <CardTitle>{t.nextNotebookTitle}</CardTitle>
          <CardDescription>{t.nextNotebookEmpty}</CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <Button type="button" onClick={onCreateNotebook}>
            Crear cuaderno
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-8 border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
          <BookOpen className="h-5 w-5 text-purple-300" aria-hidden />
          {t.nextNotebookTitle}
        </CardTitle>
        <CardDescription>{t.nextNotebookHint}</CardDescription>
      </CardHeader>

      <div className="flex flex-col gap-4 px-6 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{next.subject}</h3>
            <Badge tone={statusTone(next.status)}>{next.statusLabel}</Badge>
            {next.examDays !== null && next.examDays <= 14 ? (
              <Badge tone={next.examDays <= 7 ? "danger" : "warning"}>{t.examInDays(next.examDays)}</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-slate-300">
            {next.pageCount === 0
              ? "Sin apuntes — el quiz usará material genérico hasta que subas archivos."
              : next.status === "unlinked"
                ? t.linkedNotes(next.linkedCount, next.pageCount)
                : `${next.pageCount} apunte${next.pageCount === 1 ? "" : "s"} listos para practicar.`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {next.status === "empty" && onQuickUpload ? (
            <Button className="gap-2" onClick={() => onQuickUpload({ subject: next.subject })}>
              <Upload className="h-4 w-4" aria-hidden />
              {next.nextActionLabel}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          ) : (
            <Link href={next.nextActionHref}>
              <Button className={cn("gap-2", next.status === "empty" ? "" : "")}>
                {next.status === "empty" ? <Upload className="h-4 w-4" aria-hidden /> : null}
                {next.nextActionLabel}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          )}
          <Link href={next.href}>
            <Button variant="secondary">{t.openReader}</Button>
          </Link>
          {next.pageCount > 0 ? (
            <Link href={next.kitHref}>
              <Button variant="ghost">{t.quickKit}</Button>
            </Link>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
