import { describe, expect, it } from "vitest";

import { estimateAiCostUsd, modelFromRequestBody, parseOpenAiUsage } from "@/lib/ai/estimate-cost";

const mini = {
  inputUsdPerMillion: 0.4,
  outputUsdPerMillion: 1.6,
  cachedInputUsdPerMillion: 0.1,
};

describe("estimateAiCostUsd", () => {
  it("prices fresh input and output per million tokens", () => {
    expect(
      estimateAiCostUsd({ inputTokens: 1_000_000, outputTokens: 1_000_000, cachedTokens: 0 }, mini),
    ).toBe(2);
  });

  it("bills cached input at the cached price", () => {
    expect(
      estimateAiCostUsd({ inputTokens: 1_000_000, outputTokens: 0, cachedTokens: 1_000_000 }, mini),
    ).toBe(0.1);
  });

  it("ignores negative token counts", () => {
    expect(estimateAiCostUsd({ inputTokens: -5, outputTokens: -1, cachedTokens: 9 }, mini)).toBe(0);
  });
});

describe("parseOpenAiUsage", () => {
  it("reads token counts and does not keep any prompt text", () => {
    const parsed = parseOpenAiUsage({
      output_text: "respuesta privada que no debe guardarse",
      usage: {
        input_tokens: 120,
        output_tokens: 30,
        total_tokens: 150,
        input_tokens_details: { cached_tokens: 20 },
      },
    });
    expect(parsed).toEqual({
      inputTokens: 120,
      outputTokens: 30,
      cachedTokens: 20,
      totalTokens: 150,
    });
    expect(JSON.stringify(parsed)).not.toMatch(/respuesta privada/);
  });
});

describe("modelFromRequestBody", () => {
  it("reads the model and ignores the prompt", () => {
    const body = JSON.stringify({ model: "gpt-4.1-mini", input: "texto del estudiante" });
    expect(modelFromRequestBody(body)).toBe("gpt-4.1-mini");
  });
});
