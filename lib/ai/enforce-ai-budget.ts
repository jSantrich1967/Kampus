import {
  aiBudgetDecision,
  aiBudgetExceededResponse,
  aiBudgetUnavailableResponse,
  type PlanLimits,
  type UsageTotals,
} from "@/lib/ai/ai-budget";
import { licenseCoversMember, type LicenseStatus } from "@/lib/ai/organization-license";
import { readStoredContext, type ActiveContext, type ContextMembership } from "@/lib/context/active-context";
import { resolveUserEntitlements, type PlanSnapshot } from "@/lib/context/entitlements";
import { listMyOrganizations } from "@/lib/supabase/organizations-db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

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

/**
 * Returns a response when the signed-in user cannot call the model.
 * A lookup error blocks the call. It does not turn the cap off.
 */
export async function aiBudgetBlockResponse(): Promise<Response | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return aiBudgetUnavailableResponse();

  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id ?? null;
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
    if (totalsError) return aiBudgetUnavailableResponse();

    const personalPlan = await loadPersonalPlan(admin, userId);
    if (!personalPlan.ok) return aiBudgetUnavailableResponse();

    const context = await loadAcceptedContext(supabase, userId);
    const organizationLicense = await loadOrganizationLicense(admin, userId, context, now);
    if (!organizationLicense.ok) return aiBudgetUnavailableResponse();

    const entitlements = resolveUserEntitlements({
      context,
      personalPlan: personalPlan.value,
      organizationLicense: organizationLicense.value,
    });
    if (!entitlements) return aiBudgetUnavailableResponse();

    const decision = aiBudgetDecision(readTotals(totals), entitlements.limits);
    if (decision.ok) return null;
    return aiBudgetExceededResponse(decision.message);
  } catch {
    return aiBudgetUnavailableResponse();
  }
}

async function loadAcceptedContext(supabase: SupabaseClient, userId: string) {
  const memberships = await listMyOrganizations(supabase, userId).catch(() => []);
  const choices: ContextMembership[] = memberships.map((membership) => ({
    organizationId: membership.organizationId,
    name: membership.name,
    memberStatus: membership.memberStatus,
    organizationStatus: membership.organizationStatus,
  }));
  const stored = await supabase.from("user_contexts").select("organization_id").eq("user_id", userId).maybeSingle();
  const storedId = stored.error || typeof stored.data?.organization_id !== "string" ? null : stored.data.organization_id;
  return readStoredContext(storedId, choices);
}

async function loadPersonalPlan(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  userId: string,
): Promise<{ ok: true; value: PlanSnapshot } | { ok: false }> {
  const { data: assignment, error: assignmentError } = await admin
    .from("user_plans")
    .select("plan_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (assignmentError) return { ok: false };

  const planId = typeof assignment?.plan_id === "string" ? assignment.plan_id : "free";
  const limits = await loadPlanLimits(admin, planId);
  if (!limits.ok || !limits.value) return { ok: false };
  return { ok: true, value: { planId, limits: limits.value } };
}

async function loadOrganizationLicense(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  userId: string,
  context: ActiveContext,
  now: Date,
): Promise<{ ok: true; value: PlanSnapshot | null } | { ok: false }> {
  if (context.kind !== "organization") return { ok: true, value: null };

  const { data: seat, error: seatError } = await admin
    .from("organization_license_seats")
    .select("license_id, status")
    .eq("organization_id", context.organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (seatError) return { ok: false };
  if (seat?.status !== "active" || typeof seat.license_id !== "string") {
    return { ok: true, value: null };
  }

  const { data: license, error: licenseError } = await admin
    .from("organization_licenses")
    .select("plan_id, status, starts_at, ends_at")
    .eq("id", seat.license_id)
    .eq("organization_id", context.organizationId)
    .maybeSingle();
  if (licenseError) return { ok: false };

  const status = licenseStatus(license?.status);
  const planId = typeof license?.plan_id === "string" ? license.plan_id : null;
  const covers = licenseCoversMember({
    license:
      status && typeof license?.starts_at === "string"
        ? { status, startsAt: license.starts_at, endsAt: typeof license.ends_at === "string" ? license.ends_at : null }
        : null,
    seatActive: true,
    now,
  });
  if (!covers || !planId) return { ok: true, value: null };

  const limits = await loadPlanLimits(admin, planId);
  if (!limits.ok) return { ok: false };
  if (!limits.value) return { ok: true, value: null };
  return { ok: true, value: { planId, limits: limits.value } };
}

async function loadPlanLimits(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  planId: string,
): Promise<{ ok: true; value: PlanLimits | null } | { ok: false }> {
  const { data: plan, error: planError } = await admin
    .from("plans")
    .select("daily_ai_requests, monthly_ai_requests, daily_token_limit, monthly_token_limit")
    .eq("id", planId)
    .eq("active", true)
    .maybeSingle();
  if (planError) return { ok: false };
  if (!plan) return { ok: true, value: null };

  const row = plan as PlanRow;
  return {
    ok: true,
    value: {
      dailyAiRequests: row.daily_ai_requests,
      monthlyAiRequests: row.monthly_ai_requests,
      dailyTokenLimit: row.daily_token_limit,
      monthlyTokenLimit: row.monthly_token_limit,
    },
  };
}

function licenseStatus(value: unknown): LicenseStatus | null {
  if (value === "active" || value === "expired" || value === "suspended") return value;
  return null;
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
