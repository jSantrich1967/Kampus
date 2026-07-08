"use client";

import { useCallback, useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import type { DiaryMood } from "@/lib/schemas/diary-entry";
import {
  diaryStreakDays,
  hasDiaryEntryToday,
  loadDiaryEntries,
} from "@/lib/storage/diary-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  DIARY_CHANGED_EVENT,
  DIARY_SYNC_COMPLETED_EVENT,
} from "@/lib/wellbeing/diary-events";
import { syncDiaryWithCloud } from "@/lib/wellbeing/diary-sync";

export type DiaryCheckInStatus = {
  hasCheckedInToday: boolean;
  streakDays: number;
  todayEntryId: string | null;
  todayMood: DiaryMood | null;
  todayEnergy: number | null;
  loading: boolean;
};

/**
 * Check-in hoy + racha. Lee caché local al instante; con sesión sincroniza en background.
 */
export function useDiaryCheckInStatus(): DiaryCheckInStatus {
  const { hydrated, authUserId } = useKampus();
  const useCloud = Boolean(isSupabaseConfigured() && authUserId);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const [todayEntryId, setTodayEntryId] = useState<string | null>(null);
  const [todayMood, setTodayMood] = useState<DiaryMood | null>(null);
  const [todayEnergy, setTodayEnergy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const applyEntries = useCallback((entries: ReturnType<typeof loadDiaryEntries>) => {
    setHasCheckedInToday(hasDiaryEntryToday(entries));
    setStreakDays(diaryStreakDays(entries));
    const todayIso = new Date();
    const iso = `${todayIso.getFullYear()}-${String(todayIso.getMonth() + 1).padStart(2, "0")}-${String(todayIso.getDate()).padStart(2, "0")}`;
    const todayEntry = entries.find((e) => e.entryDate === iso);
    setTodayEntryId(todayEntry?.id ?? null);
    setTodayMood(todayEntry?.mood ?? null);
    setTodayEnergy(todayEntry?.energy ?? null);
  }, []);

  const refresh = useCallback(async () => {
    if (!hydrated) return;
    applyEntries(loadDiaryEntries());
    setLoading(false);

    if (!useCloud) return;

    try {
      const supabase = createSupabaseBrowserClient();
      const result = await syncDiaryWithCloud(supabase, authUserId!);
      applyEntries(result.entries);
    } catch {
      applyEntries(loadDiaryEntries());
    }
  }, [hydrated, useCloud, authUserId, applyEntries]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh, authUserId]);

  useEffect(() => {
    const onSync = () => void refresh();
    const onLocal = () => applyEntries(loadDiaryEntries());
    window.addEventListener("focus", onSync);
    window.addEventListener(DIARY_CHANGED_EVENT, onLocal);
    window.addEventListener(DIARY_SYNC_COMPLETED_EVENT, onSync);
    return () => {
      window.removeEventListener("focus", onSync);
      window.removeEventListener(DIARY_CHANGED_EVENT, onLocal);
      window.removeEventListener(DIARY_SYNC_COMPLETED_EVENT, onSync);
    };
  }, [refresh, applyEntries]);

  return { hasCheckedInToday, streakDays, todayEntryId, todayMood, todayEnergy, loading };
}
