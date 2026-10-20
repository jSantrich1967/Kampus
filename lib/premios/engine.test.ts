import { describe, expect, it } from "vitest";

import { countApprovedExams, countDuelWins, longestStreak } from "./engine";

describe("prizes engine (pure counters)", () => {
  it("computes the longest streak of consecutive study days", () => {
    expect(longestStreak([])).toBe(0);
    expect(longestStreak(["2026-10-01"])).toBe(1);
    expect(
      longestStreak(["2026-10-03", "2026-10-01", "2026-10-02", "2026-10-05", "2026-10-06", "2026-10-06"]),
    ).toBe(3);
    // Salto de mes: 31 ene → 1 feb sí es consecutivo.
    expect(longestStreak(["2026-01-31", "2026-02-01", "2026-02-02"])).toBe(3);
    expect(longestStreak(["2026-10-01", "2026-10-03"])).toBe(1);
  });

  it("counts duel wins only in finished duels with both scores", () => {
    const rows = [
      { creator_id: "u1", challenger_id: "u2", creator_score: 8, challenger_score: 5, status: "done" },
      { creator_id: "u2", challenger_id: "u1", creator_score: 3, challenger_score: 9, status: "done" },
      { creator_id: "u1", challenger_id: "u2", creator_score: 5, challenger_score: 5, status: "done" }, // empate: no cuenta
      { creator_id: "u1", challenger_id: null, creator_score: null, challenger_score: null, status: "waiting" },
      { creator_id: "u1", challenger_id: "u3", creator_score: 2, challenger_score: 7, status: "done" }, // derrota
    ];
    expect(countDuelWins(rows, "u1")).toBe(2);
    expect(countDuelWins(rows, "u2")).toBe(0);
  });

  it("counts each approved exam once, using the graded score threshold", () => {
    const rows = [
      { exam_id: "e1", status: "graded", feedback: { score: 85 } },
      { exam_id: "e1", status: "graded", feedback: { score: 90 } }, // reintento del mismo examen: una sola vez
      { exam_id: "e2", status: "graded", feedback: { score: 69 } }, // bajo el mínimo
      { exam_id: "e3", status: "graded", feedback: { score: 70 } }, // justo en el mínimo
      { exam_id: "e4", status: "submitted", feedback: null },
      { exam_id: "e5", status: "graded", feedback: null },
      { exam_id: "e6", status: "graded", feedback: { score: "80" } }, // score no numérico: no cuenta
    ];
    expect(countApprovedExams(rows, 70)).toBe(2);
    expect(countApprovedExams(rows, 90)).toBe(1);
  });
});
