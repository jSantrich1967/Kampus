import { describe, expect, it } from "vitest";

import { honestPlanText } from "@/lib/study/plan-honesty";

const perfect = [{ topic: "Regla de la cadena", correct: 1, total: 1 }];
const missed = [{ topic: "Regla de la cadena", correct: 0, total: 1 }];

describe("honestPlanText", () => {
  it("replaces a false miss after a perfect diagnosis", () => {
    expect(honestPlanText("Fallaste 0/1 en Regla de la cadena, es tu punto más débil", perfect)).toBe(
      "El diagnóstico salió completo. Este bloque mantiene lo que ya respondiste bien.",
    );
  });

  it("keeps a real miss and a neutral sentence", () => {
    expect(honestPlanText("Fallaste 0/1 en otro tema, pero falla 0/1 aquí", missed)).toBe(
      "este tema salió bien, pero falla 0/1 aquí",
    );
    expect(honestPlanText("Repaso ligero de derivadas.", perfect)).toBe("Repaso ligero de derivadas.");
  });
});
