import { beforeEach, describe, expect, it } from "vitest";

import {
  communicationRouteProgress,
  dimensionScores,
  isCommunicationRouteComplete,
  loadSoftSkillsProgress,
  saveSoftSkillsProgress,
  setSoftSkillsOwner,
  weakestDimension,
  type SoftSkillsProgress,
} from "./progress";

const ALL_HIGH: Record<string, number> = {
  c1: 5, c2: 5, c3: 5,
  e1: 4, e2: 4, e3: 4,
  t1: 3, t2: 3, t3: 3,
  g1: 1, g2: 2, g3: 3,
};

describe("soft skills progress", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setSoftSkillsOwner(null);
  });

  it("scores each dimension from its three answers", () => {
    const scores = dimensionScores(ALL_HIGH);
    expect(scores.comunicacion).toBe(100);
    expect(scores.emocional).toBe(80);
    expect(scores.equipo).toBe(60);
    expect(scores.tiempo).toBe(40);
  });

  it("returns null for a dimension with missing answers", () => {
    const scores = dimensionScores({ c1: 5 });
    expect(scores.comunicacion).toBeNull();
    expect(scores.tiempo).toBeNull();
  });

  it("finds the weakest dimension", () => {
    expect(weakestDimension(ALL_HIGH)).toBe("tiempo");
    expect(weakestDimension({})).toBeNull();
  });

  it("keeps each account's progress in its own box", () => {
    const base: SoftSkillsProgress = {
      diagnosticAnswers: { c1: 4 },
      diagnosticCompletedAt: "2026-10-20T00:00:00.000Z",
      lessonsCompleted: ["idea-en-una-frase"],
      simulationsCompleted: [],
      challengeReflection: "",
      challengeCompleted: false,
    };
    saveSoftSkillsProgress(base, "ana");
    saveSoftSkillsProgress({ ...base, lessonsCompleted: [] }, "luis");
    expect(loadSoftSkillsProgress("ana").lessonsCompleted).toEqual(["idea-en-una-frase"]);
    expect(loadSoftSkillsProgress("luis").lessonsCompleted).toEqual([]);
  });

  it("computes route progress: lessons 60, simulations 30, challenge 10", () => {
    const empty: SoftSkillsProgress = {
      diagnosticAnswers: {},
      diagnosticCompletedAt: null,
      lessonsCompleted: [],
      simulationsCompleted: [],
      challengeReflection: "",
      challengeCompleted: false,
    };
    expect(communicationRouteProgress(empty)).toBe(0);
    expect(
      communicationRouteProgress({
        ...empty,
        lessonsCompleted: ["idea-en-una-frase", "escuchar-para-entender", "hablar-en-publico", "escribir-claro"],
      }),
    ).toBe(60);
    const full: SoftSkillsProgress = {
      ...empty,
      lessonsCompleted: ["idea-en-una-frase", "escuchar-para-entender", "hablar-en-publico", "escribir-claro"],
      simulationsCompleted: ["exponer-en-clase", "companero-no-cumple"],
      challengeReflection: "Entendió la idea, se perdió en el ejemplo.",
      challengeCompleted: true,
    };
    expect(communicationRouteProgress(full)).toBe(100);
    expect(isCommunicationRouteComplete(full)).toBe(true);
  });

  it("ignores unknown ids so progress cannot be inflated", () => {
    const fake: SoftSkillsProgress = {
      diagnosticAnswers: {},
      diagnosticCompletedAt: null,
      lessonsCompleted: ["no-existe"],
      simulationsCompleted: ["tampoco"],
      challengeReflection: "x",
      challengeCompleted: true,
    };
    // El reto sí cuenta (hay reflexión), las ids inventadas no.
    expect(communicationRouteProgress(fake)).toBe(10);
  });
});
