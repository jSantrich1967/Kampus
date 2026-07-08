"use client";

import { Braces, FileDown, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { DiaryEntry } from "@/lib/schemas/diary-entry";
import { diaryEntriesForExport, type DiaryExportRange } from "@/lib/wellbeing/diary-export";
import { buildDiaryFhirLiteBundle, downloadDiaryFhirJson } from "@/lib/wellbeing/diary-fhir-export";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

type Props = {
  entries: DiaryEntry[];
};

const RANGES: DiaryExportRange[] = [7, 14, 30, "all"];

export function DiaryFhirExportMenu({ entries }: Props) {
  const t = wellbeingCopy.es;
  const [busy, setBusy] = useState<DiaryExportRange | null>(null);
  const [includeNarrative, setIncludeNarrative] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleExport(range: DiaryExportRange) {
    setError(null);
    const count = diaryEntriesForExport(entries, range).length;
    if (count === 0) {
      setError(t.fhirExportEmptyHint);
      return;
    }
    setBusy(range);
    try {
      const bundle = buildDiaryFhirLiteBundle(entries, range, { includeNarrative });
      downloadDiaryFhirJson(bundle);
    } catch {
      setError(t.fhirExportError);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
        <Braces className="h-3.5 w-3.5" aria-hidden />
        {t.fhirExportTitle}
      </p>
      <label className="flex items-center gap-2 text-xs text-slate-400">
        <input
          type="checkbox"
          checked={includeNarrative}
          onChange={(e) => setIncludeNarrative(e.target.checked)}
          className="rounded border-white/20"
        />
        {t.fhirExportIncludeNarrative}
      </label>
      <div className="flex flex-wrap gap-2">
        {RANGES.map((range) => (
          <Button
            key={String(range)}
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy !== null}
            onClick={() => handleExport(range)}
            className="gap-1.5"
          >
            {busy === range ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <FileDown className="h-3.5 w-3.5" aria-hidden />
            )}
            {t.fhirExportRangeLabel(range)}
          </Button>
        ))}
      </div>
      {error ? <p className="text-xs text-amber-200">{error}</p> : null}
      <p className="text-[10px] text-slate-500">{t.fhirExportPrivacyHint}</p>
    </div>
  );
}
