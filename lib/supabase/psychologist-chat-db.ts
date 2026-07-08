import type { SupabaseClient } from "@supabase/supabase-js";

import { formatAgendaCloudError } from "@/lib/notebooks/storage-errors";
import type { PsychologistChatTurn } from "@/lib/storage/psychologist-chat-storage";

type ChatRow = {
  user_id: string;
  messages: unknown;
  updated_at: string;
};

function parseMessages(raw: unknown): PsychologistChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is PsychologistChatTurn =>
      Boolean(m) &&
      typeof m === "object" &&
      ((m as PsychologistChatTurn).role === "user" || (m as PsychologistChatTurn).role === "assistant") &&
      typeof (m as PsychologistChatTurn).content === "string",
  );
}

export type RemotePsychologistChat = {
  messages: PsychologistChatTurn[];
  updatedAt: string;
};

export async function fetchPsychologistChatRemote(
  client: SupabaseClient,
  userId: string,
): Promise<RemotePsychologistChat | null> {
  const { data, error } = await client
    .from("psychologist_chat_sessions")
    .select("user_id,messages,updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(formatAgendaCloudError(error.message));
  if (!data) return null;
  const row = data as ChatRow;
  return {
    messages: parseMessages(row.messages).slice(-28),
    updatedAt: row.updated_at,
  };
}

export async function upsertPsychologistChatRemote(
  client: SupabaseClient,
  userId: string,
  messages: PsychologistChatTurn[],
): Promise<RemotePsychologistChat> {
  const trimmed = messages.slice(-28);
  const { data, error } = await client
    .from("psychologist_chat_sessions")
    .upsert(
      {
        user_id: userId,
        messages: trimmed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("user_id,messages,updated_at")
    .single();
  if (error) throw new Error(formatAgendaCloudError(error.message));
  const row = data as ChatRow;
  return {
    messages: parseMessages(row.messages),
    updatedAt: row.updated_at,
  };
}

export async function deletePsychologistChatRemote(client: SupabaseClient, userId: string): Promise<void> {
  const { error } = await client.from("psychologist_chat_sessions").delete().eq("user_id", userId);
  if (error) throw new Error(formatAgendaCloudError(error.message));
}
