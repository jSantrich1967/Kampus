import type { SupabaseClient } from "@supabase/supabase-js";

export type StudyRoomChatMessage = {
  id: string;
  userId: string;
  displayName: string;
  body: string;
  createdAt: string;
};

export async function fetchStudyRoomMessages(
  client: SupabaseClient,
  roomCode: string,
  limit = 50,
): Promise<StudyRoomChatMessage[]> {
  const { data, error } = await client
    .from("collaborate_study_room_messages")
    .select("id,user_id,display_name,body,created_at")
    .eq("room_code", roomCode)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String((row as { id: string }).id),
    userId: String((row as { user_id: string }).user_id),
    displayName: String((row as { display_name?: string }).display_name ?? "Estudiante"),
    body: String((row as { body: string }).body),
    createdAt: String((row as { created_at: string }).created_at),
  }));
}

export async function insertStudyRoomMessage(
  client: SupabaseClient,
  roomCode: string,
  userId: string,
  displayName: string,
  body: string,
): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 500) throw new Error("Invalid message");
  const { error } = await client.from("collaborate_study_room_messages").insert({
    room_code: roomCode,
    user_id: userId,
    display_name: displayName.trim() || "Estudiante",
    body: trimmed,
  });
  if (error) throw error;
}
