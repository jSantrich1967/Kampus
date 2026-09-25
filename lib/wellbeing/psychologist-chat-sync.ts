import type { SupabaseClient } from "@supabase/supabase-js";

import {
  deletePsychologistChatRemote,
  fetchPsychologistChatRemote,
  upsertPsychologistChatRemote,
} from "@/lib/supabase/psychologist-chat-db";
import {
  clearPsychologistChatStorage,
  discardLegacyPsychologistChat,
  loadPsychologistChat,
  savePsychologistChat,
  type PsychologistChatTurn,
} from "@/lib/storage/psychologist-chat-storage";
import { isBrowserOnline } from "@/lib/wellbeing/diary-offline-flush";

export const PSYCHOLOGIST_CHAT_SYNCED_EVENT = "kampus:psychologist-chat-synced";

export function notifyPsychologistChatSynced(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PSYCHOLOGIST_CHAT_SYNCED_EVENT));
}

export type PsychologistChatSyncResult = {
  messages: PsychologistChatTurn[];
  source: "local" | "remote" | "merged";
};

export async function syncPsychologistChatWithCloud(
  client: SupabaseClient,
  userId: string,
): Promise<PsychologistChatSyncResult> {
  discardLegacyPsychologistChat();
  const local = loadPsychologistChat(userId);
  if (!isBrowserOnline()) {
    return { messages: local, source: "local" };
  }

  const remote = await fetchPsychologistChatRemote(client, userId);

  if (!remote) {
    if (local.length > 0) {
      await upsertPsychologistChatRemote(client, userId, local);
      notifyPsychologistChatSynced();
      return { messages: local, source: "merged" };
    }
    return { messages: [], source: "local" };
  }

  if (local.length === 0 || remote.messages.length > local.length) {
    savePsychologistChat(userId, remote.messages);
    notifyPsychologistChatSynced();
    return { messages: remote.messages, source: "remote" };
  }

  if (local.length > remote.messages.length) {
    await upsertPsychologistChatRemote(client, userId, local);
    notifyPsychologistChatSynced();
    return { messages: local, source: "merged" };
  }

  savePsychologistChat(userId, remote.messages);
  notifyPsychologistChatSynced();
  return { messages: remote.messages, source: "remote" };
}

export async function persistPsychologistChatToCloud(
  client: SupabaseClient,
  userId: string,
  messages: PsychologistChatTurn[],
): Promise<void> {
  savePsychologistChat(userId, messages);
  if (!isBrowserOnline() || messages.length === 0) return;
  await upsertPsychologistChatRemote(client, userId, messages);
  notifyPsychologistChatSynced();
}

export async function clearPsychologistChatEverywhere(client: SupabaseClient, userId: string): Promise<void> {
  clearPsychologistChatStorage(userId);
  discardLegacyPsychologistChat();
  if (isBrowserOnline()) {
    await deletePsychologistChatRemote(client, userId);
  }
  notifyPsychologistChatSynced();
}
