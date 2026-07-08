import type { SupabaseClient } from "@supabase/supabase-js";

export type StudyRoomPresenceRow = {
  userId: string;
  displayName: string;
  lastSeenAt: string;
};

const STALE_MS = 90_000;

export function isStudyRoomPresenceActive(lastSeenAt: string, now = Date.now()): boolean {
  const ts = new Date(lastSeenAt).getTime();
  return Number.isFinite(ts) && now - ts <= STALE_MS;
}

export async function upsertStudyRoomPresence(
  client: SupabaseClient,
  roomCode: string,
  userId: string,
  displayName: string,
): Promise<void> {
  const { error } = await client.from("collaborate_study_room_presence").upsert(
    {
      room_code: roomCode,
      user_id: userId,
      display_name: displayName.trim() || "Estudiante",
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "room_code,user_id" },
  );
  if (error) throw error;
}

export async function removeStudyRoomPresence(
  client: SupabaseClient,
  roomCode: string,
  userId: string,
): Promise<void> {
  const { error } = await client
    .from("collaborate_study_room_presence")
    .delete()
    .eq("room_code", roomCode)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function fetchStudyRoomPresence(
  client: SupabaseClient,
  roomCode: string,
): Promise<StudyRoomPresenceRow[]> {
  const { data, error } = await client
    .from("collaborate_study_room_presence")
    .select("user_id,display_name,last_seen_at")
    .eq("room_code", roomCode)
    .order("last_seen_at", { ascending: false });
  if (error) throw error;
  const now = Date.now();
  return (data ?? [])
    .map((row) => ({
      userId: String((row as { user_id: string }).user_id),
      displayName: String((row as { display_name?: string }).display_name ?? "Estudiante"),
      lastSeenAt: String((row as { last_seen_at: string }).last_seen_at),
    }))
    .filter((row) => isStudyRoomPresenceActive(row.lastSeenAt, now));
}
