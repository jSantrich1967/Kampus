import { describe, expect, it } from "vitest";

import { computeTopicMastery } from "@/lib/study/topic-mastery";

describe("computeTopicMastery", () => {
  it("combina 60% diagnóstico + 40% repasos cuando hay ambas fuentes", () => {
    const out = computeTopicMastery(
      [{ subject: "Biología", topic: "La Célula", correct: 4, total: 5 }],
      [{ subject: "Biología", topic: "La Célula", reps: 3, lapses: 1 }],
    );
    // 0.6*0.8 + 0.4*0.75 = 0.48 + 0.30 = 0.78
    expect(out).toHaveLength(1);
    expect(out[0]!.subject).toBe("Biología");
    expect(out[0]!.topics).toEqual([{ topic: "La Célula", pct: 78, uncertain: false, attempts: 9 }]);
  });

  it("usa solo el diagnóstico cuando no hay repasos", () => {
    const out = computeTopicMastery(
      [{ subject: "Física", topic: "Cinemática", correct: 1, total: 4 }],
      [],
    );
    expect(out[0]!.topics).toEqual([{ topic: "Cinemática", pct: 25, uncertain: true, attempts: 4 }]);
  });

  it("usa solo los repasos cuando no hay diagnóstico", () => {
    const out = computeTopicMastery(
      [],
      [{ subject: "Biología", topic: "Biología", reps: 2, lapses: 2 }],
    );
    expect(out[0]!.topics).toEqual([{ topic: "Biología", pct: 50, uncertain: true, attempts: 4 }]);
  });

  it("agrupa por materia y ordena temas por dominio descendente", () => {
    const out = computeTopicMastery(
      [
        { subject: "Biología", topic: "La Célula", correct: 5, total: 5 },
        { subject: "Biología", topic: "Fotosíntesis", correct: 1, total: 5 },
      ],
      [],
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.topics.map((t) => t.topic)).toEqual(["La Célula", "Fotosíntesis"]);
    expect(out[0]!.topics.every((t) => t.uncertain === false)).toBe(true);
  });

  it("ignora filas vacías y totales inválidos", () => {
    const out = computeTopicMastery(
      [{ subject: "  ", topic: "X", correct: 1, total: 1 }],
      [{ subject: "Biología", topic: "Biología", reps: 0, lapses: 0 }],
    );
    // Sin datos válidos: pct null → "sin datos", nunca un % falso
    expect(out).toHaveLength(1);
    expect(out[0]!.topics).toEqual([{ topic: "Biología", pct: null, uncertain: false, attempts: 0 }]);
  });

  it("une mayúsculas/minúsculas de la misma materia y tema", () => {
    const out = computeTopicMastery(
      [{ subject: "biología", topic: "la célula", correct: 3, total: 4 }],
      [{ subject: "Biología", topic: "La Célula", reps: 1, lapses: 0 }],
    );
    expect(out).toHaveLength(1);
    // 0.6*0.75 + 0.4*1 = 0.85
    expect(out[0]!.topics).toEqual([{ topic: "la célula", pct: 85, uncertain: false, attempts: 5 }]);
  });

  it("un olvido no borra los aciertos acumulados", () => {
    const out = computeTopicMastery(
      [],
      [{ subject: "Matemáticas", topic: "Fracciones", reps: 0, lapses: 1, successes: 10 }],
    );
    expect(out[0]!.topics).toEqual([{ topic: "Fracciones", pct: 91, uncertain: false, attempts: 11 }]);
  });
});
