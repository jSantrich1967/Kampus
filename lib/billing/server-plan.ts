import type { SupabaseClient } from "@supabase/supabase-js";

export type ServerPlan = "free" | "premium";

export type EntitlementRow = {
  plan?: unknown;
  expires_at?: unknown;
};

/**
 * Pro is premium only while the entitlement row says so and the period
 * has not ended. A missing row, a free row, or a past date is free.
 * This does not read profiles.body.plan.
 */
export function planFromEntitlement(row: EntitlementRow | null, now = new Date()): ServerPlan {
  if (!row || row.plan !== "premium" || typeof row.expires_at !== "string") return "free";
  const expiresAt = Date.parse(row.expires_at);
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) return "free";
  return "premium";
}

/**
 * Plan the server will enforce. The client profile JSON is not consulted.
 */
export async function getServerUserPlan(
  supabase: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<ServerPlan> {
  try {
    const { data, error } = await supabase
      .from("billing_entitlements")
      .select("plan, expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return "free";
    return planFromEntitlement((data as EntitlementRow | null) ?? null, now);
  } catch {
    return "free";
  }
}

export const PRO_ONLY_MESSAGE =
  "Esta función es del plan Pro. Actívalo desde Ajustes → Tu plan.";
