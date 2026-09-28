import { aiBudgetDecision, aiBudgetExceededResponse, type PlanLimits, type UsageTotals } from "@/lib/ai/ai-budget";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PlanRow = {
  daily_ai_requests: number;
  monthly_ai_requests: number;
  daily_token_limit: number;
  monthly_token_limit: number;
};

type TotalsRow = {
  daily_requests: number;
  daily_tokens: number;
  monthly_requests: number;
  monthly_tokens: number;
};

/** Returns a 429 response when the signed-in user is over the database plan. Missing tables do not block. */
export async function aiBudgetBlockResponse(): Promise<Response | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  let userId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
    if (!userId) {
      return aiBudgetExceededResponse("Inicia sesión para usar la IA.");
    }

    const now = new Date();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const { data: totals, error: totalsError } = await supabase.rpc("ai_usage_totals", {
      p_day_start: dayStart,
      p_month_start: monthStart,
    });
    if (totalsError) return null;

    const limits = await loadLimits(admin, userId);
    if (!limits) return null;

    const decision = aiBudgetDecision(readTotals(totals), limits);
    if (decision.ok) return null;
    return aiBudgetExceededResponse(decision.message);
  } catch {
    return null;
  }
}

async function loadLimits(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  userId: string,
): Promise<PlanLimits | null> {
  const { data: assignment, error: assignmentError } = await admin
    .from("user_plans")
    .select("plan_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (assignmentError) return null;

  const planId = typeof assignment?.plan_id === "string" ? assignment.plan_id : "free";
  const { data: plan, error: planError } = await admin
    .from("plans")
    .select("daily_ai_requests, monthly_ai_requests, daily_token_limit, monthly_token_limit")
    .eq("id", planId)
    .eq("active", true)
    .maybeSingle();
  if (planError || !plan) return null;

  const row = plan as PlanRow;
  return {
    dailyAiRequests: row.daily_ai_requests,
    monthlyAiRequests: row.monthly_ai_requests,
    dailyTokenLimit: row.daily_token_limit,
    monthlyTokenLimit: row.monthly_token_limit,
  };
}

function readTotals(data: unknown): UsageTotals {
  const row = (Array.isArray(data) ? data[0] : data) as TotalsRow | null;
  return {
    dailyRequests: numberOrZero(row?.daily_requests),
    monthlyRequests: numberOrZero(row?.monthly_requests),
    dailyTokens: numberOrZero(row?.daily_tokens),
    monthlyTokens: numberOrZero(row?.monthly_tokens),
  };
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
