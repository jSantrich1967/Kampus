"use client";

import { useEffect } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { markVirtualClassAttendance } from "@/lib/supabase/virtual-class-attendance-db";

/** Marks virtual class attendance once when the session page loads. */
export function useVirtualClassAttendance(sessionId: string | null, enabled: boolean): void {
  useEffect(() => {
    if (!sessionId || !enabled || !isSupabaseConfigured()) return;
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        await markVirtualClassAttendance(supabase, sessionId);
      } catch {
        /* optional — roster may be closed */
      }
    })();
  }, [sessionId, enabled]);
}
