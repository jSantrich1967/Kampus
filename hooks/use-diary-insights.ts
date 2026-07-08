"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { computeDiaryInsights, type DiaryInsights } from "@/lib/wellbeing/diary-insights";
import { loadDiaryEntries } from "@/lib/storage/diary-storage";
import { DIARY_CHANGED_EVENT, DIARY_SYNC_COMPLETED_EVENT } from "@/lib/wellbeing/diary-events";

export function useDiaryInsights(): { insights: DiaryInsights; loading: boolean } {
  const pathname = usePathname();
  const { hydrated } = useKampus();
  const [entries, setEntries] = useState(loadDiaryEntries());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setEntries(loadDiaryEntries());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    refresh();
  }, [hydrated, refresh, pathname]);

  useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener(DIARY_CHANGED_EVENT, onChange);
    window.addEventListener(DIARY_SYNC_COMPLETED_EVENT, onChange);
    window.addEventListener("focus", onChange);
    return () => {
      window.removeEventListener(DIARY_CHANGED_EVENT, onChange);
      window.removeEventListener(DIARY_SYNC_COMPLETED_EVENT, onChange);
      window.removeEventListener("focus", onChange);
    };
  }, [refresh]);

  const insights = useMemo(() => computeDiaryInsights(entries), [entries]);

  return { insights, loading };
}
