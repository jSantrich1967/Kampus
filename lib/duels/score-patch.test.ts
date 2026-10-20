import { describe, expect, it } from "vitest";

import { duelScorePatch } from "@/lib/duels/score-patch";

const openDuel = {
  creator_id: "creator",
  challenger_id: null,
  creator_score: null,
  creator_name: "Ana",
};

describe("duelScorePatch", () => {
  it("lets the creator write only creator fields", () => {
    const result = duelScorePatch(openDuel, "creator", 3, 1000, "Ana");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.patch).toEqual({
      creator_score: 3,
      creator_time_ms: 1000,
      creator_name: "Ana",
    });
    expect(result.patch).not.toHaveProperty("questions");
  });

  it("rejects a third player", () => {
    const result = duelScorePatch(
      { ...openDuel, challenger_id: "challenger" },
      "stranger",
      1,
      10,
      "X",
    );
    expect(result).toEqual({ ok: false, error: "not_participant" });
  });

  it("lets the challenger join an open duel without rewriting the creator", () => {
    const result = duelScorePatch(openDuel, "challenger", 2, 500, "Luis");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.patch.challenger_id).toBe("challenger");
    expect(result.patch).not.toHaveProperty("creator_score");
    expect(result.patch).not.toHaveProperty("questions");
  });
});
