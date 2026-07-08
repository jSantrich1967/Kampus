import type { SupabaseClient } from "@supabase/supabase-js";

import { localIsoDate } from "@/lib/calendar/local-iso-date";

export async function upsertCollaborateDeadlinePushOptIn(
  client: SupabaseClient,
  userId: string,
  enabled: boolean,
): Promise<void> {
  const { error } = await client.from("collaborate_deadline_push_opt_in").upsert(
    {
      user_id: userId,
      enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function fetchCollaborateDeadlinePushOptIn(
  client: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("collaborate_deadline_push_opt_in")
    .select("enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.enabled);
}

export async function listDeadlinePushOptInUserIds(client: SupabaseClient): Promise<string[]> {
  const { data, error } = await client
    .from("collaborate_deadline_push_opt_in")
    .select("user_id")
    .eq("enabled", true);
  if (error) throw error;
  return (data ?? []).map((r) => String((r as { user_id: string }).user_id));
}

export async function markDeadlinePushSent(client: SupabaseClient, userId: string, date = localIsoDate()): Promise<boolean> {
  const { error } = await client.from("collaborate_deadline_push_last").insert({ user_id: userId, sent_date: date });
  if (error) {
    const msg = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique")) return false;
    throw error;
  }
  return true;
}

export async function wasDeadlinePushSentToday(client: SupabaseClient, userId: string, date = localIsoDate()): Promise<boolean> {
  const { data, error } = await client
    .from("collaborate_deadline_push_last")
    .select("user_id")
    .eq("user_id", userId)
    .eq("sent_date", date)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
