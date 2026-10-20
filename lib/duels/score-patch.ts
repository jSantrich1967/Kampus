export type DuelScoreInput = {
  creator_id: string;
  challenger_id: string | null;
  creator_score: number | null;
  creator_name: string;
};

/** Fields a player is allowed to write. Questions and the other player stay untouched. */
export function duelScorePatch(
  duel: DuelScoreInput,
  userId: string,
  score: number,
  timeMs: number,
  playerName: string,
): { ok: true; patch: Record<string, unknown> } | { ok: false; error: "not_participant" } {
  if (duel.creator_id === userId) {
    return {
      ok: true,
      patch: {
        creator_score: score,
        creator_time_ms: timeMs,
        creator_name: playerName || duel.creator_name,
      },
    };
  }

  if (duel.challenger_id && duel.challenger_id !== userId) {
    return { ok: false, error: "not_participant" };
  }

  return {
    ok: true,
    patch: {
      challenger_id: userId,
      challenger_name: playerName || "Retador",
      challenger_score: score,
      challenger_time_ms: timeMs,
      status: "done",
    },
  };
}
