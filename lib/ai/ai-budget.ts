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

export const AI_BUDGET_UNAVAILABLE_MESSAGE =
  "No pudimos comprobar tu cupo de IA. Inténtalo de nuevo en un momento.";

export function aiBudgetExceededResponse(message: string): Response {
  return budgetResponse(message, 429, "exceeded");
}

/** Keeps the cap on when the plan or usage cannot be read. The call does not reach OpenAI. */
export function aiBudgetUnavailableResponse(): Response {
  return budgetResponse(AI_BUDGET_UNAVAILABLE_MESSAGE, 503, "unavailable");
}

function budgetResponse(message: string, status: number, mark: "exceeded" | "unavailable"): Response {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: {
      "content-type": "application/json",
      [AI_BUDGET_HEADER]: mark,
    },
  });
}

export function isAiBudgetResponse(response: Response): boolean {
  const mark = response.headers.get(AI_BUDGET_HEADER);
  return mark === "exceeded" || mark === "unavailable";
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
