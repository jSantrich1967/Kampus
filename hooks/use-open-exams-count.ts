"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import type { Exam } from "@/lib/schemas/exams";
import { seedDemoExamsIfEmpty, loadExams } from "@/lib/storage/exams-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ensureDemoExamsRemote, fetchUserExams } from "@/lib/supabase/agenda-db";

function countOpenExams(list: Exam[]): number {
  return list.filter((e) => e.status === "open").length;
}

/**
 * Cuántos exámenes están en estado abierto (el estudiante puede intentarlos).
 * Alineado con la lista en /exams/student: incluye seed demo si aún no hay datos.
 */
export function useOpenExamsCount(): number {
  const pathname = usePathname();
  const { hydrated, authUserId, profile } = useKampus();
  const useCloud = Boolean(isSupabaseConfigured() && authUserId);
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!hydrated) return;
    try {
      let list: Exam[];
      if (useCloud) {
        const supabase = createSupabaseBrowserClient();
        await ensureDemoExamsRemote(supabase, authUserId!, profile.subjects[0]);
        list = await fetchUserExams(supabase, authUserId!);
      } else {
        seedDemoExamsIfEmpty(profile.subjects[0]);
        list = loadExams();
      }
      setCount(countOpenExams(list));
    } catch {
      setCount(0);
    }
  }, [hydrated, useCloud, authUserId, profile.subjects]);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return count;
}
