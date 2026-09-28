import { estimateAiCostUsd, parseOpenAiUsage, type TokenPrice } from "@/lib/ai/estimate-cost";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PriceRow = {
  model: string;
  input_usd_per_million: number;
  output_usd_per_million: number;
  cached_input_usd_per_million: number;
};

const priceCache = new Map<string, { at: number; price: TokenPrice | null }>();
const PRICE_TTL_MS = 5 * 60 * 1000;

export async function recordOpenAiResponse(input: {
  feature: string;
  model: string;
  startedAt: number;
  response: Response;
}): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    if (!admin) return;

    const elapsed = Math.max(0, Date.now() - input.startedAt);
    const requestId = input.response.headers.get("x-request-id");
    let tokens = { inputTokens: 0, outputTokens: 0, cachedTokens: 0, totalTokens: 0 };
    if (input.response.ok) {
      try {
        tokens = parseOpenAiUsage(await input.response.clone().json());
      } catch {
        tokens = { inputTokens: 0, outputTokens: 0, cachedTokens: 0, totalTokens: 0 };
      }
    }

    const price = await loadPrice(admin, input.model);
    const estimated = price
      ? estimateAiCostUsd(tokens, price)
      : 0;

    const userId = await currentUserId();
    await admin.from("ai_usage").insert({
      user_id: userId,
      provider: "openai",
      model: input.model.slice(0, 80) || "unknown",
      feature: input.feature.slice(0, 80),
      request_id: requestId ? requestId.slice(0, 120) : null,
      input_tokens: tokens.inputTokens,
      output_tokens: tokens.outputTokens,
      cached_tokens: tokens.cachedTokens,
      total_tokens: tokens.totalTokens,
      estimated_cost_usd: estimated,
      response_time_ms: elapsed,
      success: input.response.ok,
      error_code: input.response.ok ? null : String(input.response.status),
      metadata: { priceSource: price ? "database" : "missing" },
    });
  } catch {
    // A missing ledger must not block the study feature.
  }
}

async function currentUserId(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

async function loadPrice(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  model: string,
): Promise<TokenPrice | null> {
  const cached = priceCache.get(model);
  if (cached && Date.now() - cached.at < PRICE_TTL_MS) return cached.price;

  const { data, error } = await admin
    .from("ai_model_prices")
    .select("model, input_usd_per_million, output_usd_per_million, cached_input_usd_per_million")
    .eq("provider", "openai")
    .eq("model", model)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) {
    priceCache.set(model, { at: Date.now(), price: null });
    return null;
  }

  const row = data as PriceRow;
  const price = {
    inputUsdPerMillion: Number(row.input_usd_per_million),
    outputUsdPerMillion: Number(row.output_usd_per_million),
    cachedInputUsdPerMillion: Number(row.cached_input_usd_per_million),
  };
  priceCache.set(model, { at: Date.now(), price });
  return price;
}
