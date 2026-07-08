"use client";

import { useCallback, useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import type { ClassScheduleRow } from "@/lib/schemas/class-schedule";
import { loadClassSchedule, saveClassSchedule } from "@/lib/storage/class-schedule-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { fetchClassScheduleRemote } from "@/lib/supabase/agenda-db";

export const CLASS_SCHEDULE_CHANGED = "kampus:classScheduleChanged";

export function notifyClassScheduleChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CLASS_SCHEDULE_CHANGED));
}

/** Single source for class schedule: Supabase when logged in, else localStorage (cached on cloud fetch). */
export function useClassSchedule() {
  const { hydrated, authUserId } = useKampus();
  const useCloud = Boolean(isSupabaseConfigured() && authUserId);
  const [schedule, setSchedule] = useState<ClassScheduleRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!hydrated) return;

    if (useCloud) {
      setLoading(true);
      try {
        const supabase = createSupabaseBrowserClient();
        const rows = await fetchClassScheduleRemote(supabase, authUserId!);
        saveClassSchedule(rows);
        setSchedule(rows);
      } catch {
        setSchedule(loadClassSchedule());
      } finally {
        setLoading(false);
      }
      return;
    }

    setSchedule(loadClassSchedule());
  }, [hydrated, useCloud, authUserId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onChange = () => void refresh();
    window.addEventListener(CLASS_SCHEDULE_CHANGED, onChange);
    window.addEventListener("focus", onChange);
    return () => {
      window.removeEventListener(CLASS_SCHEDULE_CHANGED, onChange);
      window.removeEventListener("focus", onChange);
    };
  }, [refresh]);

  return { schedule, loading, refresh };
}
