import { describe, expect, it } from "vitest";

import {
  aiBudgetDecision,
  aiBudgetExceededResponse,
  aiBudgetUnavailableResponse,
  isAiBudgetResponse,
  planLimitMessage,
} from "@/lib/ai/ai-budget";

const limits = {
  dailyAiRequests: 2,
  monthlyAiRequests: 5,
  dailyTokenLimit: 100,
  monthlyTokenLimit: 400,
};

describe("aiBudgetDecision", () => {
  it("allows a student still under every limit", () => {
    expect(
      aiBudgetDecision(
        { dailyRequests: 1, monthlyRequests: 4, dailyTokens: 99, monthlyTokens: 399 },
        limits,
      ).ok,
    ).toBe(true);
  });

  it("blocks when today's requests are used up", () => {
    const decision = aiBudgetDecision(
      { dailyRequests: 2, monthlyRequests: 2, dailyTokens: 10, monthlyTokens: 10 },
      limits,
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.message).toMatch(/hoy/);
  });

  it("blocks when the month's tokens are used up", () => {
    const decision = aiBudgetDecision(
      { dailyRequests: 0, monthlyRequests: 1, dailyTokens: 0, monthlyTokens: 400 },
      limits,
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.message).toMatch(/mes/);
  });
});

describe("ai budget response", () => {
  it("marks a Kampus limit so it is not confused with an OpenAI billing error", () => {
    const response = aiBudgetExceededResponse("límite");
    expect(response.status).toBe(429);
    expect(isAiBudgetResponse(response)).toBe(true);
  });

  it("keeps the cap on when the budget cannot be read", () => {
    const response = aiBudgetUnavailableResponse();
    expect(response.status).toBe(503);
    expect(isAiBudgetResponse(response)).toBe(true);
  });
});

describe("planLimitMessage", () => {
  it("returns the specific limit message when called before the body is read", async () => {
    const specific = "Alcanzaste los tokens de IA de hoy para tu plan.";
    const response = aiBudgetExceededResponse(specific);
    // Contrato: llamar ANTES de consumir el body; la función clona internamente.
    expect(await planLimitMessage(response)).toBe(specific);
    // El body original sigue disponible para el resto del manejo de errores.
    const body = (await response.json()) as { error?: { message?: string } };
    expect(body.error?.message).toBe(specific);
  });

  it("returns null for non-budget responses without touching the body", async () => {
    const response = new Response(JSON.stringify({ error: "x" }), { status: 429 });
    expect(await planLimitMessage(response)).toBeNull();
    expect(await response.text()).toContain("x");
  });
});
