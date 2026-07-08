import type { SupabaseClient } from "@supabase/supabase-js";

import { parseStudyRoomState } from "@/lib/collaborate/study-room-cloud-sync";
import type { StudyRoomState } from "@/lib/storage/study-room-storage";

export type CloudStudyRoomRow = {
  state: StudyRoomState;
  updatedAt: string;
};

export async function fetchCollaborateStudyRoom(
  client: SupabaseClient,
  roomCode: string,
): Promise<CloudStudyRoomRow | null> {
  const { data, error } = await client
    .from("collaborate_study_rooms")
    .select("state, updated_at")
    .eq("room_code", roomCode)
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
  const { error } = await client.from("collaborate_study_rooms").upsert(
    {
      room_code: roomCode,
      state,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    },
    { onConflict: "room_code" },
  );
  if (error) throw error;
}
