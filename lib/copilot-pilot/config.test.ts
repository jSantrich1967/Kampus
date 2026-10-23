import { describe, expect, it } from "vitest";

import {
  COPILOT_PILOT_QUOTA_KEY,
  copilotPilotDailyLimit,
  isCopilotPilotEnabled,
} from "./config";

describe("isCopilotPilotEnabled", () => {
  it("está apagado por defecto (sin la variable)", () => {
    expect(isCopilotPilotEnabled({})).toBe(false);
  });

  it("está apagado con cualquier valor distinto de \"true\"", () => {
    expect(isCopilotPilotEnabled({ NEXT_PUBLIC_COPILOT_PILOT_ENABLED: "false" })).toBe(false);
    expect(isCopilotPilotEnabled({ NEXT_PUBLIC_COPILOT_PILOT_ENABLED: "1" })).toBe(false);
    expect(isCopilotPilotEnabled({ NEXT_PUBLIC_COPILOT_PILOT_ENABLED: "TRUE" })).toBe(false);
  });

  it("se enciende solo con \"true\"", () => {
    expect(isCopilotPilotEnabled({ NEXT_PUBLIC_COPILOT_PILOT_ENABLED: "true" })).toBe(true);
  });
});

describe("copilotPilotDailyLimit", () => {
  it("usa 30 por defecto y respeta el override válido", () => {
    expect(copilotPilotDailyLimit({})).toBe(30);
    expect(copilotPilotDailyLimit({ API_DAILY_LIMIT_COPILOT_PILOT: "12" })).toBe(12);
  });

  it("cae al valor por defecto con valores inválidos", () => {
    expect(copilotPilotDailyLimit({ API_DAILY_LIMIT_COPILOT_PILOT: "abc" })).toBe(30);
    expect(copilotPilotDailyLimit({ API_DAILY_LIMIT_COPILOT_PILOT: "0" })).toBe(30);
    expect(copilotPilotDailyLimit({ API_DAILY_LIMIT_COPILOT_PILOT: "-5" })).toBe(30);
  });
});

describe("clave de cuota del piloto", () => {
  it("es distinta de las claves existentes (no comparte contador con el Tutor)", () => {
    expect(COPILOT_PILOT_QUOTA_KEY).toBe("copilot_pilot");
    expect(COPILOT_PILOT_QUOTA_KEY).not.toBe("socratic_tutor");
  });
});
