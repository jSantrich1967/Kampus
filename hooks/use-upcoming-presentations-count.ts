"use client";

import { useCallback, useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import {
  isPresentationDueSoon,
  PRESENTATIONS_CHANGED_EVENT,
} from "@/lib/collaborate/presentation-urgency";
import { loadPresentation } from "@/lib/storage/presentation-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { fetchPresentationDeckSummariesRemote } from "@/lib/supabase/agenda-db";

/**
 * Exposiciones con fecha en los próximos 14 días (o hasta 7 días vencidas).
 */
export function useUpcomingPresentationsCount(): number {
  const { hydrated, authUserId } = useKampus();
  const useCloud = Boolean(isSupabaseConfigured() && authUserId);
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!hydrated) return;
    try {
      if (useCloud) {
        const summaries = await fetchPresentationDeckSummariesRemote(
          createSupabaseBrowserClient(),
          authUserId!,
        );
        setCount(summaries.filter((s) => isPresentationDueSoon(s.presentationDueDate)).length);
      } else {
        const loc = loadPresentation();
        setCount(isPresentationDueSoon(loc.presentationDueDate) ? 1 : 0);
      }
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
    window.addEventListener(PRESENTATIONS_CHANGED_EVENT, onSync);
    return () => window.removeEventListener(PRESENTATIONS_CHANGED_EVENT, onSync);
  }, [refresh]);

  return count;
}
