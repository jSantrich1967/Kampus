export type PlanLimits = {
  dailyAiRequests: number;
  monthlyAiRequests: number;
  dailyTokenLimit: number;
  monthlyTokenLimit: number;
};

export type UsageTotals = {
  dailyRequests: number;
  monthlyRequests: number;
  dailyTokens: number;
  monthlyTokens: number;
};

export function aiBudgetDecision(
  usage: UsageTotals,
  limits: PlanLimits,
): { ok: true } | { ok: false; message: string } {
  if (usage.dailyRequests >= limits.dailyAiRequests) {
    return { ok: false, message: "Alcanzaste las consultas de IA de hoy para tu plan." };
  }
  if (usage.monthlyRequests >= limits.monthlyAiRequests) {
    return { ok: false, message: "Alcanzaste las consultas de IA de este mes para tu plan." };
  }
  if (usage.dailyTokens >= limits.dailyTokenLimit) {
    return { ok: false, message: "Alcanzaste los tokens de IA de hoy para tu plan." };
  }
  if (usage.monthlyTokens >= limits.monthlyTokenLimit) {
    return { ok: false, message: "Alcanzaste los tokens de IA de este mes para tu plan." };
  }
  return { ok: true };
}

export const AI_BUDGET_HEADER = "x-kampus-ai-budget";

export function aiBudgetExceededResponse(message: string): Response {
  return new Response(JSON.stringify({ error: { message } }), {
    status: 429,
    headers: {
      "content-type": "application/json",
      [AI_BUDGET_HEADER]: "exceeded",
    },
  });
}

export function isAiBudgetResponse(response: Response): boolean {
  return response.headers.get(AI_BUDGET_HEADER) === "exceeded";
}

export async function planLimitMessage(response: Response): Promise<string | null> {
  if (!isAiBudgetResponse(response)) return null;
  try {
    const body = (await response.clone().json()) as { error?: { message?: string } };
    return body.error?.message || "Alcanzaste el límite de IA de tu plan.";
  } catch {
    return "Alcanzaste el límite de IA de tu plan.";
  }
}
