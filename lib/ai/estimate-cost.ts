export type TokenPrice = {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  cachedInputUsdPerMillion: number;
};

export type TokenCounts = {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
};

/** Uncached input is billed at the input price. Cached input uses its own price. */
export function estimateAiCostUsd(tokens: TokenCounts, price: TokenPrice): number {
  const input = nonNegative(tokens.inputTokens);
  const output = nonNegative(tokens.outputTokens);
  const cached = Math.min(nonNegative(tokens.cachedTokens), input);
  const freshInput = input - cached;
  const cost =
    (freshInput / 1_000_000) * price.inputUsdPerMillion +
    (cached / 1_000_000) * price.cachedInputUsdPerMillion +
    (output / 1_000_000) * price.outputUsdPerMillion;
  return roundUsd(cost);
}

export function parseOpenAiUsage(body: unknown): TokenCounts & { totalTokens: number } {
  const usage = isRecord(body) && isRecord(body.usage) ? body.usage : null;
  const inputTokens = numberField(usage, "input_tokens");
  const outputTokens = numberField(usage, "output_tokens");
  const details = usage && isRecord(usage.input_tokens_details) ? usage.input_tokens_details : null;
  const cachedTokens = numberField(details, "cached_tokens");
  const totalTokens = numberField(usage, "total_tokens") || inputTokens + outputTokens;
  return { inputTokens, outputTokens, cachedTokens, totalTokens };
}

export function modelFromRequestBody(body: BodyInit | null | undefined): string {
  if (typeof body !== "string") return "unknown";
  try {
    const parsed = JSON.parse(body) as unknown;
    if (!isRecord(parsed) || typeof parsed.model !== "string") return "unknown";
    const model = parsed.model.trim();
    return model.slice(0, 80) || "unknown";
  } catch {
    return "unknown";
  }
}

function nonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberField(record: Record<string, unknown> | null, key: string): number {
  if (!record) return 0;
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
