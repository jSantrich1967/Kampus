import type { SupabaseClient } from "@supabase/supabase-js";

export type ParticipationParticipant = {
  userId: string;
  displayName: string;
  lastActiveAt: string;
  heartbeatCount: number;
  activeNow: boolean;
};

export type ParticipationLiveSnapshot = {
  activeNow: number;
  totalParticipants: number;
  participants: ParticipationParticipant[];
};

export async function upsertVirtualClassParticipation(
  client: SupabaseClient,
  sessionId: string,
  displayName: string,
): Promise<void> {
  const { error } = await client.rpc("upsert_virtual_class_participation", {
    p_session_id: sessionId,
    p_display_name: displayName,
  });
  if (error) throw error;
}

export async function fetchVirtualClassParticipationLive(
  client: SupabaseClient,
  sessionId: string,
): Promise<ParticipationLiveSnapshot> {
  const { data, error } = await client.rpc("list_virtual_class_participation_live", {
    p_session_id: sessionId,
  });
  if (error) throw error;

  const root = (data ?? {}) as Record<string, unknown>;
  const participantsRaw = root.participants;
  const participants: ParticipationParticipant[] = Array.isArray(participantsRaw)
    ? participantsRaw.map((p) => {
        const row = p as Record<string, unknown>;
        return {
          userId: String(row.userId ?? row.user_id ?? ""),
          displayName: String(row.displayName ?? row.display_name ?? "Estudiante"),
          lastActiveAt: String(row.lastActiveAt ?? row.last_active_at ?? ""),
          heartbeatCount: Number(row.heartbeatCount ?? row.heartbeat_count ?? 0),
          activeNow: Boolean(row.activeNow ?? row.active_now ?? false),
        };
      })
    : [];

  return {
    activeNow: Number(root.activeNow ?? root.active_now ?? 0),
    totalParticipants: Number(root.totalParticipants ?? root.total_participants ?? participants.length),
    participants,
  };
}
