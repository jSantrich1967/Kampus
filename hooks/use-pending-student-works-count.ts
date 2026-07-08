"use client";

import { useCallback, useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { isStudentWorkCompleted } from "@/lib/schemas/student-work";
import { loadStudentWorks } from "@/lib/storage/student-work-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { fetchStudentWorksRemote } from "@/lib/supabase/agenda-db";

/** Disparar tras crear, borrar o cambiar estado de entrega para refrescar badges (p. ej. sidebar). */
export const STUDENT_WORKS_CHANGED_EVENT = "kampus:student-works-changed";

export function notifyStudentWorksChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STUDENT_WORKS_CHANGED_EVENT));
}

/**
 * Cuántos trabajos / investigaciones están pendientes (no marcados como entregados).
 * Se actualiza al cambiar de ruta, al volver el foco a la pestaña y tras {@link notifyStudentWorksChanged}.
 */
export function usePendingStudentWorksCount(): number {
  const { hydrated, authUserId } = useKampus();
  const useCloud = Boolean(isSupabaseConfigured() && authUserId);
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!hydrated) return;
    try {
      const works = useCloud
        ? await fetchStudentWorksRemote(createSupabaseBrowserClient(), authUserId!)
        : loadStudentWorks();
      setCount(works.filter((w) => !isStudentWorkCompleted(w)).length);
    } catch {
      setCount(0);
    }
  }, [hydrated, useCloud, authUserId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  useEffect(() => {
    const onSync = () => void refresh();
    window.addEventListener(STUDENT_WORKS_CHANGED_EVENT, onSync);
    return () => window.removeEventListener(STUDENT_WORKS_CHANGED_EVENT, onSync);
  }, [refresh]);

  return count;
}
