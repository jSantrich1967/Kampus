"use client";

import { useCallback, useEffect } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { fireVirtualClassReminderNotification } from "@/lib/collaborate/virtual-class-notify";
import { loadVirtualClassNotifyEnabled } from "@/lib/collaborate/virtual-class-notify-storage";
import { fetchMyEnrolledVirtualClassSessions } from "@/lib/supabase/virtual-class-db";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Browser notify ~1 hour before enrolled virtual classes when enabled. */
export function useVirtualClassReminder(): void {
  const { authUserId } = useKampus();
  const useCloud = Boolean(isSupabaseConfigured() && authUserId);

  const tick = useCallback(async () => {
    if (!useCloud || !authUserId || !loadVirtualClassNotifyEnabled()) return;
    try {
      const supabase = createSupabaseBrowserClient();
      const sessions = await fetchMyEnrolledVirtualClassSessions(supabase, authUserId);
      await fireVirtualClassReminderNotification(sessions);
    } catch {
      /* ignore */
    }
  }, [authUserId, useCloud]);

  useEffect(() => {
    void tick();
    const id = window.setInterval(() => void tick(), 60_000 * 2);
    return () => window.clearInterval(id);
  }, [tick]);
}
