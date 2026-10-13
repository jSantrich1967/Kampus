import { describe, expect, it } from "vitest";

import {
  FREE_DAILY_RECORDINGS,
  FREE_MAX_SECONDS,
  LECTURE_MAX_BYTES,
  PRO_DAILY_RECORDINGS,
  PRO_MAX_SECONDS,
  dailyLimitForPlan,
  isUsefulTranscript,
  lectureQuotaExhaustedMessage,
  maxSecondsForPlan,
  validateLectureUpload,
} from "./validate";

describe("lecture gating constants", () => {
  it("gratis: 1 grabación/día de 10 min; pro: 5/día de 90 min", () => {
    expect(FREE_DAILY_RECORDINGS).toBe(1);
    expect(PRO_DAILY_RECORDINGS).toBe(5);
    expect(FREE_MAX_SECONDS).toBe(600);
    expect(PRO_MAX_SECONDS).toBe(5400);
    expect(dailyLimitForPlan("free")).toBe(1);
    expect(dailyLimitForPlan("premium")).toBe(5);
    expect(maxSecondsForPlan("free")).toBe(600);
    expect(maxSecondsForPlan("premium")).toBe(5400);
  });

  it("el mensaje de cupo agotado menciona Pro solo para gratis", () => {
    expect(lectureQuotaExhaustedMessage("free")).toContain("Pro ($5/mes)");
    expect(lectureQuotaExhaustedMessage("premium")).not.toContain("Pro ($5/mes)");
  });
});

describe("validateLectureUpload", () => {
  it("acepta una subida válida", () => {
    expect(validateLectureUpload({ sizeBytes: 1024, durationSeconds: 120, maxSeconds: 600 })).toEqual({
      ok: true,
    });
  });

  it("rechaza audio vacío o sin tamaño", () => {
    expect(validateLectureUpload({ sizeBytes: 0, durationSeconds: 60, maxSeconds: 600 }).ok).toBe(false);
    expect(validateLectureUpload({ sizeBytes: NaN, durationSeconds: 60, maxSeconds: 600 }).ok).toBe(false);
  });

  it("rechaza archivos sobre 50 MB", () => {
    const r = validateLectureUpload({ sizeBytes: LECTURE_MAX_BYTES + 1, durationSeconds: 60, maxSeconds: 600 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("50 MB");
  });

  it("rechaza duración inválida o sobre el máximo del plan", () => {
    expect(validateLectureUpload({ sizeBytes: 1024, durationSeconds: 0, maxSeconds: 600 }).ok).toBe(false);
    const r = validateLectureUpload({ sizeBytes: 1024, durationSeconds: 601, maxSeconds: 600 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("10 minutos");
  });
});

describe("isUsefulTranscript", () => {
  it("una transcripción real es útil", () => {
    expect(isUsefulTranscript("Hoy vamos a hablar de la fotosíntesis y sus dos fases principales.")).toBe(true);
  });

  it("texto vacío, cortísimo o solo ruido no es útil: no se generan apuntes", () => {
    expect(isUsefulTranscript("")).toBe(false);
    expect(isUsefulTranscript("   ")).toBe(false);
    expect(isUsefulTranscript("[Música]")).toBe(false);
    expect(isUsefulTranscript("eh... mmm...")).toBe(false);
    expect(isUsefulTranscript("123 456 789")).toBe(false);
  });
});
