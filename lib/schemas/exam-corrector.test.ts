import { describe, expect, it } from "vitest";

import { reconcileExamCorrection } from "./exam-corrector";

describe("reconcileExamCorrection", () => {
  it("replaces the model total with the sum of the items", () => {
    const correction = reconcileExamCorrection({
      studentName: "Ana",
      totalEarned: 18,
      totalPossible: 20,
      percentage: 90,
      label: "18/20",
      items: [
        {
          question: "Uno",
          expected: "2",
          studentAnswer: "2",
          maxPoints: 5,
          points: 5,
          correct: true,
          comment: "Bien",
        },
        {
          question: "Dos",
          expected: "4",
          studentAnswer: "3",
          maxPoints: 5,
          points: 9,
          correct: false,
          comment: "Casi",
        },
      ],
      strengths: ["Orden"],
      toImprove: ["Cálculo"],
      generalComment: "Revisar la segunda.",
    });

    expect(correction.items[1]?.points).toBe(5);
    expect(correction.totalEarned).toBe(10);
    expect(correction.totalPossible).toBe(10);
    expect(correction.percentage).toBe(100);
  });
});
