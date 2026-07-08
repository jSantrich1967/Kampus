"use client";

import { useEffect, useRef, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  fetchVirtualClassParticipationLive,
  upsertVirtualClassParticipation,
  type ParticipationLiveSnapshot,
} from "@/lib/supabase/virtual-class-participation-db";

const HEARTBEAT_MS = 25_000;

export function useVirtualClassParticipation(
  sessionId: string,
  enabled: boolean,
  isCreator: boolean,
): { live: ParticipationLiveSnapshot | null; realtime: boolean } {
  const { authUserId, profile } = useKampus();
  const active = Boolean(isSupabaseConfigured() && authUserId && sessionId && enabled);
  const [live, setLive] = useState<ParticipationLiveSnapshot | null>(null);
  const [realtime, setRealtime] = useState(false);
  const displayNameRef = useRef(profile.displayName || "Estudiante");

  useEffect(() => {
    displayNameRef.current = profile.displayName || "Estudiante";
  }, [profile.displayName]);

  useEffect(() => {
    if (!active || !authUserId) {
      setLive(null);
      setRealtime(false);
      return;
    }

    let cancelled = false;

    async function refreshLive() {
      if (!isCreator) return;
      try {
        const supabase = createSupabaseBrowserClient();
        const snapshot = await fetchVirtualClassParticipationLive(supabase, sessionId);
        if (!cancelled) setLive(snapshot);
      } catch {
        if (!cancelled) setLive(null);
      }
    }

    async function heartbeat() {
      try {
        const supabase = createSupabaseBrowserClient();
        await upsertVirtualClassParticipation(supabase, sessionId, displayNameRef.current);
        if (isCreator) await refreshLive();
      } catch {
        /* optional */
      }
    }

    void heartbeat();
    const heartbeatId = window.setInterval(() => void heartbeat(), HEARTBEAT_MS);

    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    if (isCreator) {
      void refreshLive();
      channel = supabase
        .channel(`virtual-class-participation-${sessionId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "virtual_class_participation",
            filter: `session_id=eq.${sessionId}`,
          },
          () => {
            void refreshLive();
          },
        )
        .subscribe((status) => {
          if (!cancelled) setRealtime(status === "SUBSCRIBED");
        });
    }

    return () => {
      cancelled = true;
      window.clearInterval(heartbeatId);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [active, authUserId, isCreator, sessionId]);

  return { live, realtime };
}
