"use client";

import Link from "next/link";
import { BookOpen, Calendar, Loader2, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { examsCopy } from "@/lib/i18n/exams";
import type { ExamSubjectMaterialStatus } from "@/lib/exams/exam-subject-material";
import { subjectToPathSegment } from "@/lib/notebooks/paths";

type ExamMaterialPanelProps = {
  subject: string;
  loading?: boolean;
  material: ExamSubjectMaterialStatus;
};

export function ExamMaterialPanel({ subject, loading = false, material }: ExamMaterialPanelProps) {
  const t = examsCopy.es;
  const slug = subjectToPathSegment(subject);
  const notebookHref = `/study/notebook/${slug}`;
  const uploadHref = `/study/notebook/${slug}?kit=1`;

  const description = loading
    ? t.materialLoading
    : material.hasRealMaterial
      ? t.materialReady(material.summary, material.linkedCount)
      : t.materialEmpty;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.materialTitle}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        {!loading && material.hasRealMaterial ? (
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">{t.materialPages(material.pageCount)}</Badge>
            {material.linkedCount > 0 ? (
              <Badge tone="neutral">{t.materialLinked(material.linkedCount)}</Badge>
            ) : (
              <Badge tone="warning">{t.materialUnlinked}</Badge>
            )}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.materialLoading}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Link href={notebookHref}>
            <Button size="sm" variant="secondary" className="gap-2">
              <BookOpen className="h-4 w-4" aria-hidden />
              {t.materialNotebookCta}
            </Button>
          </Link>
          <Link href="/exams/calendar">
            <Button size="sm" variant="secondary" className="gap-2">
              <Calendar className="h-4 w-4" aria-hidden />
              {t.materialCalendarCta}
            </Button>
          </Link>
          {!loading && !material.hasRealMaterial ? (
            <Link href={uploadHref}>
              <Button size="sm" variant="ghost" className="gap-2">
                <Upload className="h-4 w-4" aria-hidden />
                {t.materialUploadCta}
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
