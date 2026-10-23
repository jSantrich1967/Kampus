import { describe, expect, it } from "vitest";

import { SPACED_REVIEW_DAYS, buildStudyPlan, summarizeStudyPlan } from "./study-plan";

describe("buildStudyPlan", () => {
  it("crea una sesión por cada día espaciado, con todos los temas en orden", () => {
    const plan = buildStudyPlan("Biología", ["La célula", "Fotosíntesis"]);
    expect(plan.notebookTitle).toBe("Biología");
    expect(plan.totalTopics).toBe(2);
    expect(plan.sessions).toHaveLength(SPACED_REVIEW_DAYS.length);
    expect(plan.sessions.map((s) => s.dayOffset)).toEqual([...SPACED_REVIEW_DAYS]);
    for (const session of plan.sessions) {
      expect(session.topics).toEqual(["La célula", "Fotosíntesis"]);
      expect(session.guidance.length).toBeGreaterThan(0);
    }
  });

  it("descarta temas vacíos y duplicados conservando el primer orden", () => {
    const plan = buildStudyPlan("Historia", ["  ", "Roma", "Grecia", "Roma", " Grecia "]);
    expect(plan.totalTopics).toBe(2);
    expect(plan.sessions[0].topics).toEqual(["Roma", "Grecia"]);
  });

  it("sin temas devuelve plan vacío (sin sesiones)", () => {
    const plan = buildStudyPlan("Vacío", []);
    expect(plan.totalTopics).toBe(0);
    expect(plan.sessions).toEqual([]);
  });

  it("usa «Cuaderno» si el título viene vacío", () => {
    expect(buildStudyPlan("  ", ["Tema"]).notebookTitle).toBe("Cuaderno");
  });
});

describe("summarizeStudyPlan", () => {
  it("resume el plan en texto con título, temas y días", () => {
    const text = summarizeStudyPlan(buildStudyPlan("Biología", ["La célula"]));
    expect(text).toContain("Biología");
    expect(text).toContain("La célula");
    expect(text).toContain("Día 1");
    expect(text).toContain("/repasos");
  });

  it("explica que no hay plan cuando el cuaderno no tiene temas", () => {
    const text = summarizeStudyPlan(buildStudyPlan("Biología", []));
    expect(text).toContain("no tiene temas");
  });
});
