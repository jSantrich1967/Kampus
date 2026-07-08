"use client";

import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { DiaryEntry } from "@/lib/schemas/diary-entry";
import { diaryEntriesForExport, exportDiaryToPdf, type DiaryExportRange } from "@/lib/wellbeing/diary-export";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

type Props = {
  entries: DiaryEntry[];
  ownerLabel?: string;
};

const RANGES: DiaryExportRange[] = [7, 14, 30, "all"];

export function DiaryExportMenu({ entries, ownerLabel }: Props) {
  const t = wellbeingCopy.es;
  const [busy, setBusy] = useState<DiaryExportRange | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(range: DiaryExportRange) {
    setError(null);
    const count = diaryEntriesForExport(entries, range).length;
    if (count === 0) {
      setError(t.exportEmptyHint);
      return;
    }
    setBusy(range);
    try {
      await exportDiaryToPdf(entries, range, ownerLabel);
    } catch (e) {
      setError(e instanceof Error && e.message === "empty" ? t.exportEmptyHint : t.exportError);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t.exportTitle}</p>
      <div className="flex flex-wrap gap-2">
        {RANGES.map((range) => (
          <Button
            key={String(range)}
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy !== null}
            onClick={() => void handleExport(range)}
            className="gap-1.5"
          >
            {busy === range ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <FileDown className="h-3.5 w-3.5" aria-hidden />
            )}
            {t.exportRangeLabel(range)}
          </Button>
        ))}
      </div>
      {error ? <p className="text-xs text-amber-200">{error}</p> : null}
      <p className="text-[10px] text-slate-500">{t.exportPrivacyHint}</p>
    </div>
  );
}
