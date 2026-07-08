"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import {
  fetchStudyRoomMessages,
  insertStudyRoomMessage,
  type StudyRoomChatMessage,
} from "@/lib/supabase/study-room-chat-db";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function useStudyRoomChat(
  roomCode: string,
  hydrated: boolean,
): {
  active: boolean;
  messages: StudyRoomChatMessage[];
  sending: boolean;
  sendMessage: (body: string) => Promise<boolean>;
} {
  const { authUserId, profile } = useKampus();
  const active = Boolean(isSupabaseConfigured() && authUserId && roomCode !== "default" && hydrated);
  const [messages, setMessages] = useState<StudyRoomChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const displayNameRef = useRef(profile.displayName || "Estudiante");
  displayNameRef.current = profile.displayName || "Estudiante";

  const refresh = useCallback(async () => {
    if (!active || !authUserId) return;
    try {
      const supabase = createSupabaseBrowserClient();
      const rows = await fetchStudyRoomMessages(supabase, roomCode);
      setMessages(rows);
    } catch {
      setMessages([]);
    }
  }, [active, authUserId, roomCode]);

  useEffect(() => {
    if (!active || !authUserId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    void refresh();

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`study-room-chat-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "collaborate_study_room_messages",
          filter: `room_code=eq.${roomCode}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
      if (cancelled) setMessages([]);
    };
  }, [active, authUserId, roomCode, refresh]);

  const sendMessage = useCallback(
    async (body: string): Promise<boolean> => {
      if (!active || !authUserId) return false;
      setSending(true);
      try {
        const supabase = createSupabaseBrowserClient();
        await insertStudyRoomMessage(supabase, roomCode, authUserId, displayNameRef.current, body);
        await refresh();
        return true;
      } catch {
        return false;
      } finally {
        setSending(false);
      }
    },
    [active, authUserId, roomCode, refresh],
  );

  return { active, messages, sending, sendMessage };
}
