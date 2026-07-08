"use client";

import { useEffect, useRef, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import {
  fetchStudyRoomPresence,
  removeStudyRoomPresence,
  upsertStudyRoomPresence,
  type StudyRoomPresenceRow,
} from "@/lib/supabase/study-room-presence-db";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const HEARTBEAT_MS = 25_000;

export function useStudyRoomPresence(
  roomCode: string,
  hydrated: boolean,
): { active: boolean; peers: StudyRoomPresenceRow[] } {
  const { authUserId, profile } = useKampus();
  const active = Boolean(isSupabaseConfigured() && authUserId && roomCode !== "default" && hydrated);
  const [peers, setPeers] = useState<StudyRoomPresenceRow[]>([]);
  const displayNameRef = useRef(profile.displayName || "Estudiante");
  displayNameRef.current = profile.displayName || "Estudiante";

  useEffect(() => {
    if (!active || !authUserId) {
      setPeers([]);
      return;
    }

    let cancelled = false;

    async function refresh() {
      try {
        const supabase = createSupabaseBrowserClient();
        const rows = await fetchStudyRoomPresence(supabase, roomCode);
        if (!cancelled) setPeers(rows);
      } catch {
        if (!cancelled) setPeers([]);
      }
    }

    async function heartbeat() {
      try {
        const supabase = createSupabaseBrowserClient();
        await upsertStudyRoomPresence(supabase, roomCode, authUserId!, displayNameRef.current);
        await refresh();
      } catch {
        /* ignore transient errors */
      }
    }

    void heartbeat();
    const heartbeatId = window.setInterval(() => void heartbeat(), HEARTBEAT_MS);

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`study-room-presence-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collaborate_study_room_presence",
          filter: `room_code=eq.${roomCode}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.clearInterval(heartbeatId);
      void supabase.removeChannel(channel);
      void removeStudyRoomPresence(supabase, roomCode, authUserId).catch(() => undefined);
    };
  }, [active, authUserId, roomCode]);

  return { active, peers };
}
