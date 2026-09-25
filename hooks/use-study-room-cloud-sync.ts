"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { parseStudyRoomState, pickNewerStudyRoomState } from "@/lib/collaborate/study-room-cloud-sync";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  ensureStudyRoomMember,
  fetchCollaborateStudyRoom,
  upsertCollaborateStudyRoom,
} from "@/lib/supabase/study-room-db";
import type { StudyRoomState } from "@/lib/storage/study-room-storage";

const PUSH_DEBOUNCE_MS = 900;

export function useStudyRoomCloudSync(
  roomCode: string,
  hydrated: boolean,
  state: StudyRoomState,
  setState: Dispatch<SetStateAction<StudyRoomState>>,
  hasLocalSave: boolean,
): { cloudActive: boolean; syncing: boolean; realtime: boolean; cloudError: string | null } {
  const { authUserId } = useKampus();
  const cloudActive = Boolean(isSupabaseConfigured() && authUserId && roomCode !== "default");
  const stateRef = useRef(state);
  stateRef.current = state;
  const localUpdatedAtRef = useRef(0);
  const pushTimerRef = useRef<number | null>(null);
  const skipNextPushRef = useRef(false);
  const [pullReady, setPullReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [realtime, setRealtime] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  useEffect(() => {
    if (!cloudActive || !authUserId || !hydrated) return;

    let cancelled = false;
    setPullReady(false);
    // A saved box is this account's offline copy. An empty box must not overwrite the shared room.
    localUpdatedAtRef.current = hasLocalSave ? Date.now() : 0;

    async function pull() {
      try {
        const supabase = createSupabaseBrowserClient();
        await ensureStudyRoomMember(supabase, roomCode);
        const remote = await fetchCollaborateStudyRoom(supabase, roomCode);
        if (cancelled) return;
        if (remote) {
          const remoteTs = new Date(remote.updatedAt).getTime();
          if (remoteTs > localUpdatedAtRef.current) {
            skipNextPushRef.current = true;
            localUpdatedAtRef.current = remoteTs;
            setState(pickNewerStudyRoomState(stateRef.current, 0, remote.state, remoteTs));
          }
        }
        setCloudError(null);
      } catch (e) {
        if (!cancelled) setCloudError(e instanceof Error ? e.message : "Sync error");
      } finally {
        if (!cancelled) setPullReady(true);
      }
    }

    void pull();

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`study-room-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "collaborate_study_rooms",
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          const row = payload.new as { state?: unknown; updated_at?: string };
          if (!row?.updated_at) return;
          const remoteTs = new Date(row.updated_at).getTime();
          if (remoteTs <= localUpdatedAtRef.current) return;
          skipNextPushRef.current = true;
          localUpdatedAtRef.current = remoteTs;
          const remoteState = parseStudyRoomState(row.state);
          setState((prev) => pickNewerStudyRoomState(prev, localUpdatedAtRef.current, remoteState, remoteTs));
        },
      )
      .subscribe((status) => {
        if (!cancelled) setRealtime(status === "SUBSCRIBED");
      });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
      setRealtime(false);
    };
  }, [cloudActive, authUserId, hydrated, roomCode, setState, hasLocalSave]);

  useEffect(() => {
    if (!cloudActive || !authUserId || !hydrated || !pullReady) return;

    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }

    localUpdatedAtRef.current = Date.now();

    if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
    pushTimerRef.current = window.setTimeout(() => {
      void (async () => {
        setSyncing(true);
        try {
          const supabase = createSupabaseBrowserClient();
          await upsertCollaborateStudyRoom(supabase, roomCode, authUserId, stateRef.current);
          setCloudError(null);
        } catch (e) {
          setCloudError(e instanceof Error ? e.message : "Sync error");
        } finally {
          setSyncing(false);
        }
      })();
    }, PUSH_DEBOUNCE_MS);

    return () => {
      if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
    };
  }, [state, cloudActive, authUserId, hydrated, pullReady, roomCode]);

  return { cloudActive, syncing, realtime, cloudError };
}
