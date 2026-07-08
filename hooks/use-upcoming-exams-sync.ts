"use client";

import { useEffect, useRef } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { applyAgendaExamsToProfile } from "@/lib/exams/refresh-profile-upcoming-exams";
import { seedDemoExamsIfEmpty, loadExams } from "@/lib/storage/exams-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ensureDemoExamsRemote, fetchUserExams } from "@/lib/supabase/agenda-db";

/** Loads agenda exams and merges due dates into profile.upcomingExams (silent, once per session). */
export function useUpcomingExamsSync() {
  const { profile, setProfile, hydrated, authUserId } = useKampus();
  const syncedRef = useRef(false);
  const useCloud = Boolean(isSupabaseConfigured() && authUserId);

  useEffect(() => {
    if (!hydrated || profile.role === "teacher" || syncedRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        let exams;
        if (useCloud) {
          const supabase = createSupabaseBrowserClient();
          await ensureDemoExamsRemote(supabase, authUserId!, profile.subjects[0]);
          exams = (await fetchUserExams(supabase, authUserId!)).filter((e) => e.status !== "draft");
        } else {
          seedDemoExamsIfEmpty(profile.subjects[0]);
          exams = loadExams().filter((e) => e.status !== "draft");
        }

        if (cancelled) return;
        syncedRef.current = true;

        setProfile((prev) => applyAgendaExamsToProfile(prev, exams));
      } catch {
        syncedRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, profile.role, profile.subjects, useCloud, authUserId, setProfile]);
}
