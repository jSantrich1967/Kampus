"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { useClassSchedule } from "@/hooks/use-class-schedule";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { buildNotebookHealthAlerts, type NotebookHealthAlert } from "@/lib/today/notebook-health";
import { buildTodayClassSlots, type TodayClassSlot } from "@/lib/today/today-classes";

export type TodayContextData = {
  loading: boolean;
  todayClasses: TodayClassSlot[];
  alerts: NotebookHealthAlert[];
  hasSchedule: boolean;
  refresh: () => void;
};

export function useTodayContext(prioritySubjects: string[] = []): TodayContextData {
  const { authUserId, profile } = useKampus();
  const { schedule, loading: scheduleLoading, refresh: refreshSchedule } = useClassSchedule();
  const [docs, setDocs] = useState<NotebookDocumentRow[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    void refreshSchedule();
    setTick((n) => n + 1);
  }, [refreshSchedule]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !authUserId) {
      setDocs([]);
      setDocsLoading(false);
      return;
    }

    let cancelled = false;
    setDocsLoading(true);

    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("notebook_documents")
          .select("*")
          .eq("user_id", authUserId)
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        if (!cancelled) setDocs((data as NotebookDocumentRow[]) ?? []);
      } catch {
        if (!cancelled) setDocs([]);
      } finally {
        if (!cancelled) setDocsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUserId, tick]);

  const examDaysBySubject = useMemo(() => {
    const map = new Map<string, number>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const exam of profile.upcomingExams) {
      const target = new Date(exam.date);
      if (Number.isNaN(target.getTime())) continue;
      target.setHours(0, 0, 0, 0);
      const days = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      map.set(exam.subject, days);
    }
    return map;
  }, [profile.upcomingExams]);

  const todayClasses = useMemo(() => buildTodayClassSlots(schedule, docs), [schedule, docs]);

  const alerts = useMemo(
    () =>
      buildNotebookHealthAlerts({
        subjects: profile.subjects,
        docs,
        todayClasses,
        prioritySubjects,
        examDaysBySubject,
      }),
    [profile.subjects, docs, todayClasses, prioritySubjects, examDaysBySubject],
  );

  return {
    loading: scheduleLoading || docsLoading,
    todayClasses,
    alerts,
    hasSchedule: schedule.length > 0,
    refresh,
  };
}
