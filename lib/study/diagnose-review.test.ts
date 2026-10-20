import { describe, expect, it } from "vitest";

import { reviewDiagnosis, scoreDiagnosis } from "@/lib/study/diagnose-review";

const questions = [
  { topic: "Límites", options: ["2", "4", "0", "1"], answerIndex: 1 },
  { topic: "Derivadas", options: ["x", "2x", "3x^2-5", "5"], answerIndex: 2 },
];

describe("reviewDiagnosis", () => {
  it("marks only the item whose chosen option differs from the key", () => {
    const review = reviewDiagnosis(questions, [1, 0]);
    expect(review[0]?.matched).toBe(true);
    expect(review[1]?.matched).toBe(false);
    expect(review[1]?.selected).toBe("x");
    expect(review[1]?.key).toBe("3x^2-5");
  });

  it("drops an excluded item from the count", () => {
    const review = reviewDiagnosis(questions, [1, 0]);
    expect(scoreDiagnosis(review)).toEqual({ correct: 1, total: 2 });
    expect(scoreDiagnosis(review, new Set([1]))).toEqual({ correct: 1, total: 1 });
  });
});
