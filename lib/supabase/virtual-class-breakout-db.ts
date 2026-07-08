import type { SupabaseClient } from "@supabase/supabase-js";

export type BreakoutRoomRow = {
  id: string;
  label: string;
  roomCode: string;
  videoUrl: string | null;
  createdAt: string;
};

export async function fetchVirtualClassBreakoutRooms(
  client: SupabaseClient,
  sessionId: string,
): Promise<BreakoutRoomRow[]> {
  const { data, error } = await client
    .from("virtual_class_breakout_rooms")
    .select("id,label,room_code,video_url,created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String((row as { id: string }).id),
    label: String((row as { label: string }).label),
    roomCode: String((row as { room_code: string }).room_code),
    videoUrl: (row as { video_url: string | null }).video_url ?? null,
    createdAt: String((row as { created_at: string }).created_at),
  }));
}

export async function insertVirtualClassBreakoutRoom(
  client: SupabaseClient,
  sessionId: string,
  label: string,
  roomCode: string,
  videoUrl?: string | null,
): Promise<void> {
  const { error } = await client.from("virtual_class_breakout_rooms").insert({
    session_id: sessionId,
    label: label.trim(),
    room_code: roomCode,
    video_url: videoUrl?.trim() || null,
  });
  if (error) throw error;
}

export async function updateVirtualClassBreakoutVideoUrl(
  client: SupabaseClient,
  breakoutId: string,
  videoUrl: string | null,
): Promise<void> {
  const { error } = await client
    .from("virtual_class_breakout_rooms")
    .update({ video_url: videoUrl?.trim() || null })
    .eq("id", breakoutId);
  if (error) throw error;
}

export async function deleteVirtualClassBreakoutRoom(client: SupabaseClient, breakoutId: string): Promise<void> {
  const { error } = await client.from("virtual_class_breakout_rooms").delete().eq("id", breakoutId);
  if (error) throw error;
}

export async function updateVirtualClassRecordingUrl(
  client: SupabaseClient,
  sessionId: string,
  recordingUrl: string | null,
): Promise<void> {
  const { error } = await client
    .from("virtual_class_sessions")
    .update({ recording_url: recordingUrl?.trim() || null })
    .eq("id", sessionId);
  if (error) throw error;
}
