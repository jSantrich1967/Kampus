import type { SupabaseClient } from "@supabase/supabase-js";

import { parseStudyRoomState } from "@/lib/collaborate/study-room-cloud-sync";
import { normalizeStudyRoomCode } from "@/lib/collaborate/study-room-path";
import type { StudyRoomState } from "@/lib/storage/study-room-storage";

export type CloudStudyRoomRow = {
  state: StudyRoomState;
  updatedAt: string;
};

/** Creates the room if needed and records this user as a member. Required before read/write. */
export async function ensureStudyRoomMember(client: SupabaseClient, roomCode: string): Promise<void> {
  const code = normalizeStudyRoomCode(roomCode);
  if (code === "default") throw new Error("invalid_room_code");
  const { error } = await client.rpc("join_collaborate_study_room", { p_room_code: code });
  if (error) throw error;
}

export async function fetchCollaborateStudyRoom(
  client: SupabaseClient,
  roomCode: string,
): Promise<CloudStudyRoomRow | null> {
  const code = normalizeStudyRoomCode(roomCode);
  const { data, error } = await client
    .from("collaborate_study_rooms")
    .select("state, updated_at")
    .eq("room_code", code)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    state: parseStudyRoomState(data.state),
    updatedAt: String(data.updated_at),
  };
}

export async function upsertCollaborateStudyRoom(
  client: SupabaseClient,
  roomCode: string,
  userId: string,
  state: StudyRoomState,
): Promise<void> {
  const code = normalizeStudyRoomCode(roomCode);
  await ensureStudyRoomMember(client, code);
  const { error } = await client
    .from("collaborate_study_rooms")
    .update({
      state,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq("room_code", code);
  if (error) throw error;
}
