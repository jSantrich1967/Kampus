"use client";

import { useCallback, useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { applyAgendaExamsToProfile } from "@/lib/exams/refresh-profile-upcoming-exams";
import { seedDemoExamsIfEmpty, loadExams } from "@/lib/storage/exams-storage";
import type { StudentWork } from "@/lib/schemas/student-work";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ensureDemoExamsRemote, fetchStudentWorksRemote, fetchUserExams } from "@/lib/supabase/agenda-db";

export function useAcademicRadarData(): {
  works: StudentWork[];
  loading: boolean;
  refresh: () => void;
} {
  const { profile, setProfile, hydrated, authUserId } = useKampus();
  const useCloud = Boolean(isSupabaseConfigured() && authUserId);
  const [works, setWorks] = useState<StudentWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        if (profile.role !== "teacher") {
          let agendaExams;
          if (useCloud && authUserId) {
            const supabase = createSupabaseBrowserClient();
            agendaExams = await fetchUserExams(supabase, authUserId);
          } else {
            seedDemoExamsIfEmpty(profile.subjects[0]);
            agendaExams = loadExams();
          }
          if (!cancelled) {
            setProfile((prev) => applyAgendaExamsToProfile(prev, agendaExams));
          }
        }

        if (useCloud && authUserId) {
          const supabase = createSupabaseBrowserClient();
          const workList = await fetchStudentWorksRemote(supabase, authUserId);
          if (!cancelled) setWorks(workList);
        } else {
          const { loadStudentWorks } = await import("@/lib/storage/student-work-storage");
          if (!cancelled) setWorks(loadStudentWorks());
        }
      } catch {
        if (!cancelled) setWorks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, profile.role, profile.subjects, useCloud, authUserId, setProfile, tick]);

  return { works, loading, refresh };
}

export async function bootstrapRadarDemoSignals(
  useCloud: boolean,
  authUserId: string | null,
  subjectHint: string,
): Promise<{ ok: boolean; examsSeeded: boolean; researchInserted: number }> {
  let examsSeeded = false;
  let researchInserted = 0;

  if (useCloud && authUserId) {
    const supabase = createSupabaseBrowserClient();
    const beforeExams = await fetchUserExams(supabase, authUserId);
    await ensureDemoExamsRemote(supabase, authUserId, subjectHint);
    const afterExams = await fetchUserExams(supabase, authUserId);
    examsSeeded = afterExams.length > beforeExams.length;

    const { bootstrapResearchDemoWorks } = await import("@/lib/supabase/agenda-db");
    const research = await bootstrapResearchDemoWorks(supabase, authUserId);
    researchInserted = research.inserted;
  } else {
    const hadExams = loadExams().length > 0;
    seedDemoExamsIfEmpty(subjectHint);
    examsSeeded = !hadExams && loadExams().length > 0;

    const { loadStudentWorks, addStudentWork } = await import("@/lib/storage/student-work-storage");
    const hasDemo = loadStudentWorks().some((w) => w.title.startsWith("Kampus ·"));
    if (!hasDemo) {
      const pad = (n: number) => String(n).padStart(2, "0");
      const due = (days: number) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      };
      addStudentWork({
        title: "Kampus · Informe bibliográfico",
        subject: subjectHint || "General",
        dueDate: due(3),
        notes: "Demo local para el radar.",
      });
      researchInserted = 1;
    }
  }

  return { ok: true, examsSeeded, researchInserted };
}
