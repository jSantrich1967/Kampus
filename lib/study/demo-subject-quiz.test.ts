import { describe, expect, it } from "vitest";

import { buildDemoProfile } from "@/lib/demo/demo-profile";
import { generatePressureQuizQuestions } from "@/lib/study/generate-pressure-quiz";
import { buildDemoSubjectQuiz } from "@/lib/study/demo-subject-quiz";
import { shouldReloadPressureQuiz } from "@/lib/study/pressure-quiz";

const GENERIC_STUDY_HABIT = /mini-esquema|subrayado pasivo|recuperación activa/i;

describe("pressure quiz reload", () => {
  it("keeps a finished quiz in place when the profile changes", () => {
    expect(shouldReloadPressureQuiz("loading")).toBe(true);
    expect(shouldReloadPressureQuiz("ready")).toBe(true);
    expect(shouldReloadPressureQuiz("running")).toBe(false);
    expect(shouldReloadPressureQuiz("finished")).toBe(false);
  });
});

describe("demo subject quiz", () => {
  it("asks about calculus instead of generic study habits", async () => {
    const profile = buildDemoProfile();
    const result = await generatePressureQuizQuestions("Cálculo", [], profile);

    expect(result.isDemoSource).toBe(true);
    expect(result.questions.length).toBeGreaterThanOrEqual(4);
    const text = result.questions.map((q) => `${q.question} ${q.options.join(" ")}`).join("\n");
    expect(text).toMatch(/integral/i);
    expect(text).not.toMatch(GENERIC_STUDY_HABIT);
    for (const question of result.questions) {
      expect(question.answerIndex).toBeGreaterThanOrEqual(0);
      expect(question.answerIndex).toBeLessThan(question.options.length);
      expect((question.explanation ?? "").length).toBeGreaterThan(40);
    }
  });

  it("covers the other demo subjects with their own facts", () => {
    expect(buildDemoSubjectQuiz("Programación").map((q) => q.question).join(" ")).toMatch(/recurs/i);
    expect(buildDemoSubjectQuiz("Bases de datos").map((q) => q.question).join(" ")).toMatch(/forma normal|clave/i);
    expect(buildDemoSubjectQuiz("Estadística").map((q) => q.question).join(" ")).toMatch(/media|probabilidad|desviación|población/i);
  });

  it("does not invent a generic quiz for an unknown subject", () => {
    expect(buildDemoSubjectQuiz("Filosofía medieval")).toEqual([]);
  });
});
