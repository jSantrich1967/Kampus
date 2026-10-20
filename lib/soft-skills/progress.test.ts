import { beforeEach, describe, expect, it } from "vitest";

import {
  communicationRouteProgress,
  dimensionScores,
  isCommunicationRouteComplete,
  isRouteComplete,
  loadSoftSkillsProgress,
  routeProgress,
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

const EMPTY: SoftSkillsProgress = {
  diagnosticAnswers: {},
  diagnosticCompletedAt: null,
  lessonsCompleted: [],
  simulationsCompleted: [],
  challenges: {},
};

const COMM_LESSONS = ["idea-en-una-frase", "escuchar-para-entender", "hablar-en-publico", "escribir-claro"];
const COMM_SIMS = ["exponer-en-clase", "companero-no-cumple"];
const COMM_CHALLENGE = "reto-explica-60s";
const TIME_LESSONS = ["planifica-antes", "empezar-en-pequeno", "telefono-lejos", "entregas-sin-corredera"];
const TIME_SIMS = ["planifica-tu-semana", "decir-que-no"];
const TIME_CHALLENGE = "reto-semana-planificada";

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
    saveSoftSkillsProgress({ ...EMPTY, lessonsCompleted: ["idea-en-una-frase"] }, "ana");
    saveSoftSkillsProgress({ ...EMPTY, lessonsCompleted: [] }, "luis");
    expect(loadSoftSkillsProgress("ana").lessonsCompleted).toEqual(["idea-en-una-frase"]);
    expect(loadSoftSkillsProgress("luis").lessonsCompleted).toEqual([]);
  });

  it("computes route progress: lessons 60, simulations 30, challenge 10", () => {
    expect(routeProgress(EMPTY, "comunicacion")).toBe(0);
    expect(communicationRouteProgress({ ...EMPTY, lessonsCompleted: COMM_LESSONS })).toBe(60);
    const full: SoftSkillsProgress = {
      ...EMPTY,
      lessonsCompleted: COMM_LESSONS,
      simulationsCompleted: COMM_SIMS,
      challenges: { [COMM_CHALLENGE]: { reflection: "Entendió la idea, se perdió en el ejemplo.", completed: true } },
    };
    expect(communicationRouteProgress(full)).toBe(100);
    expect(isCommunicationRouteComplete(full)).toBe(true);
  });

  it("tracks the time-management route independently from communication", () => {
    const timeOnly: SoftSkillsProgress = {
      ...EMPTY,
      lessonsCompleted: TIME_LESSONS,
      simulationsCompleted: TIME_SIMS,
      challenges: { [TIME_CHALLENGE]: { reflection: "Cumplí 5 de 7 bloques.", completed: true } },
    };
    expect(routeProgress(timeOnly, "gestion-del-tiempo")).toBe(100);
    expect(isRouteComplete(timeOnly, "gestion-del-tiempo")).toBe(true);
    expect(routeProgress(timeOnly, "comunicacion")).toBe(0);
  });

  it("ignores unknown ids so progress cannot be inflated", () => {
    const fake: SoftSkillsProgress = {
      ...EMPTY,
      lessonsCompleted: ["no-existe"],
      simulationsCompleted: ["tampoco"],
      challenges: { [COMM_CHALLENGE]: { reflection: "x", completed: true } },
    };
    // El reto cuenta (está completado y tiene reflexión); las ids inventadas no.
    expect(routeProgress(fake, "comunicacion")).toBe(10);
  });

  it("migrates the v1 single-challenge fields into the communication challenge", () => {
    window.localStorage.setItem(
      "kampus.softskills.v1.ana",
      JSON.stringify({
        diagnosticAnswers: {},
        diagnosticCompletedAt: null,
        lessonsCompleted: [],
        simulationsCompleted: [],
        challengeReflection: "Reflexión de la v1 que no debe perderse.",
        challengeCompleted: true,
      }),
    );
    const loaded = loadSoftSkillsProgress("ana");
    expect(loaded.challenges[COMM_CHALLENGE]).toEqual({
      reflection: "Reflexión de la v1 que no debe perderse.",
      completed: true,
    });
    expect(routeProgress(loaded, "comunicacion")).toBe(10);
  });
});
