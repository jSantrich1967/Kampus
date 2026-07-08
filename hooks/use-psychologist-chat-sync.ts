"use client";

import { useCallback, useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { PSYCHOLOGIST_CHAT_SYNCED_EVENT, syncPsychologistChatWithCloud } from "@/lib/wellbeing/psychologist-chat-sync";
import type { PsychologistChatTurn } from "@/lib/storage/psychologist-chat-storage";

export function usePsychologistChatSync(): {
  syncing: boolean;
  cloudSynced: boolean;
  refresh: () => Promise<PsychologistChatTurn[]>;
} {
  const { authUserId } = useKampus();
  const useCloud = Boolean(isSupabaseConfigured() && authUserId);
  const [syncing, setSyncing] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(false);

  const refresh = useCallback(async () => {
    if (!useCloud) return [];
    setSyncing(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const result = await syncPsychologistChatWithCloud(supabase, authUserId!);
      setCloudSynced(result.source === "remote" || result.source === "merged");
      return result.messages;
    } catch {
      return [];
    } finally {
      setSyncing(false);
    }
  }, [useCloud, authUserId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onSync = () => void refresh();
    window.addEventListener("online", onSync);
    window.addEventListener(PSYCHOLOGIST_CHAT_SYNCED_EVENT, onSync);
    return () => {
      window.removeEventListener("online", onSync);
      window.removeEventListener(PSYCHOLOGIST_CHAT_SYNCED_EVENT, onSync);
    };
  }, [refresh]);

  return { syncing, cloudSynced, refresh };
}
