"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import {
  buildFocusItemsFromLocalPresentation,
  buildFocusItemsFromPresentations,
  buildFocusItemsFromWorks,
  pickNearestCollaborationFocus,
  type CollaborationFocusItem,
} from "@/lib/collaborate/collaboration-deadlines";
import { PRESENTATIONS_CHANGED_EVENT } from "@/lib/collaborate/presentation-urgency";
import { STUDENT_WORKS_CHANGED_EVENT } from "@/hooks/use-pending-student-works-count";
import { loadStudentWorks } from "@/lib/storage/student-work-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { fetchPresentationDeckSummariesRemote, fetchStudentWorksRemote } from "@/lib/supabase/agenda-db";

async function loadFocusItems(useCloud: boolean, authUserId: string | null): Promise<CollaborationFocusItem[]> {
  if (useCloud && authUserId) {
    const supabase = createSupabaseBrowserClient();
    const [works, presentations] = await Promise.all([
      fetchStudentWorksRemote(supabase, authUserId),
      fetchPresentationDeckSummariesRemote(supabase, authUserId),
    ]);
    return [...buildFocusItemsFromWorks(works), ...buildFocusItemsFromPresentations(presentations)];
  }
  return [...buildFocusItemsFromWorks(loadStudentWorks()), ...buildFocusItemsFromLocalPresentation()];
}

export function useCollaborationFocusItems(): {
  items: CollaborationFocusItem[];
  next: CollaborationFocusItem | null;
  loading: boolean;
} {
  const pathname = usePathname();
  const { hydrated, authUserId } = useKampus();
  const useCloud = Boolean(isSupabaseConfigured() && authUserId);
  const [items, setItems] = useState<CollaborationFocusItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!hydrated) return;
    setLoading(true);
    try {
      const loaded = await loadFocusItems(useCloud, authUserId);
      setItems(loaded);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [hydrated, useCloud, authUserId]);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  useEffect(() => {
    const onWorks = () => void refresh();
    const onPres = () => void refresh();
    window.addEventListener(STUDENT_WORKS_CHANGED_EVENT, onWorks);
    window.addEventListener(PRESENTATIONS_CHANGED_EVENT, onPres);
    return () => {
      window.removeEventListener(STUDENT_WORKS_CHANGED_EVENT, onWorks);
      window.removeEventListener(PRESENTATIONS_CHANGED_EVENT, onPres);
    };
  }, [refresh]);

  const next = pickNearestCollaborationFocus(items);

  return { items, next, loading };
}

export function useCollaborationNextFocus(): {
  next: CollaborationFocusItem | null;
  loading: boolean;
} {
  const { next, loading } = useCollaborationFocusItems();
  return { next, loading };
}
