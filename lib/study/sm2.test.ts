import { describe, expect, it } from "vitest";

import { gradeReview, INITIAL_REVIEW_STATE, type ReviewState } from "@/lib/study/sm2";

const NOW = new Date("2026-10-13T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function state(over: Partial<ReviewState> = {}): ReviewState {
  return { ...INITIAL_REVIEW_STATE, ...over };
}

describe("gradeReview (SM-2)", () => {
  it("primera vez que la sabe: intervalo 1 día, racha 1, easiness sube a 2.6", () => {
    const g = gradeReview(state(), 5, NOW);
    expect(g.reps).toBe(1);
    expect(g.intervalDays).toBe(1);
    expect(g.lapses).toBe(0);
    expect(g.easiness).toBeCloseTo(2.6, 10);
    expect(g.nextDue.getTime()).toBe(NOW.getTime() + DAY_MS);
  });

  it("segunda vez consecutiva: intervalo 6 días", () => {
    const first = gradeReview(state(), 5, NOW);
    const second = gradeReview(first, 5, NOW);
    expect(second.reps).toBe(2);
    expect(second.intervalDays).toBe(6);
    expect(second.easiness).toBeCloseTo(2.7, 10);
  });

  it("tercera vez: intervalo = round(6 × easiness previo)", () => {
    const first = gradeReview(state(), 5, NOW);
    const second = gradeReview(first, 5, NOW);
    // easiness antes de la 3ª calificación: 2.7
    const third = gradeReview(second, 5, NOW);
    expect(third.reps).toBe(3);
    expect(third.intervalDays).toBe(Math.round(6 * 2.7)); // 16
    expect(third.easiness).toBeCloseTo(2.8, 10);
  });

  it("olvidada (quality < 3): reinicia la racha, intervalo 1, lapses +1", () => {
    const known = gradeReview(gradeReview(state(), 5, NOW), 5, NOW);
    const forgotten = gradeReview(known, 1, NOW);
    expect(forgotten.reps).toBe(0);
    expect(forgotten.lapses).toBe(1);
    expect(forgotten.intervalDays).toBe(1);
    // 2.7 + (0.1 - 4*(0.08+4*0.02)) = 2.7 - 0.54 = 2.16
    expect(forgotten.easiness).toBeCloseTo(2.16, 10);
  });

  it("dudar (quality 3) mantiene la racha con easiness menor", () => {
    const g = gradeReview(state(), 3, NOW);
    expect(g.reps).toBe(1);
    expect(g.intervalDays).toBe(1);
    // 2.5 + (0.1 - 2*(0.08+2*0.02)) = 2.5 - 0.14 = 2.36
    expect(g.easiness).toBeCloseTo(2.36, 10);
  });

  it("el easiness nunca baja de 1.3", () => {
    let s = state();
    for (let i = 0; i < 10; i++) s = gradeReview(s, 0, NOW);
    expect(s.easiness).toBeGreaterThanOrEqual(1.3);
    expect(s.easiness).toBe(1.3);
  });

  it("la calidad se limita al rango 0..5", () => {
    expect(gradeReview(state(), 99, NOW).reps).toBe(1);
    expect(gradeReview(state(), -7, NOW).reps).toBe(0);
    expect(gradeReview(state(), Number.NaN, NOW).reps).toBe(0);
  });
});
