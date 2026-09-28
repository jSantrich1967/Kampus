import type { PlanLimits } from "@/lib/ai/ai-budget";
import type { ActiveContext } from "@/lib/context/active-context";

export interface PlanSnapshot {
  planId: string;
  limits: PlanLimits;
}

export type EntitlementSource = "personal" | "organization";

export interface ResolvedEntitlements {
  source: EntitlementSource;
  planId: string;
  limits: PlanLimits;
}

/**
 * Personal context uses the personal plan.
 * An institution context uses that institution's license when one exists.
 * Without a license, the personal plan stays. The settings button is not an input.
 */
export function resolveUserEntitlements(input: {
  context: ActiveContext;
  personalPlan: PlanSnapshot | null;
  organizationLicense: PlanSnapshot | null;
}): ResolvedEntitlements | null {
  if (input.context.kind === "organization" && input.organizationLicense) {
    return { source: "organization", ...input.organizationLicense };
  }
  if (!input.personalPlan) return null;
  return { source: "personal", ...input.personalPlan };
}
