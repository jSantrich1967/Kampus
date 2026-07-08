import type { SupabaseClient } from "@supabase/supabase-js";

export type CounselorAlertInput = {
  institutionKey: string;
  weekStart: string;
  riskLevel: "watch" | "elevated";
  riskScore: number;
  reasons: string[];
  channel: "auto" | "manual";
};

export type InstitutionCounselorAlertsSummary = {
  alerts14d: number;
  watchCount: number;
  elevatedCount: number;
  autoCount: number;
  manualCount: number;
  lastAlertAt: string | null;
};

export async function insertCounselorAlert(
  client: SupabaseClient,
  userId: string,
  input: CounselorAlertInput,
): Promise<void> {
  const { error } = await client.from("wellbeing_counselor_alerts").insert({
    user_id: userId,
    institution_key: input.institutionKey,
    week_start: input.weekStart,
    risk_level: input.riskLevel,
    risk_score: input.riskScore,
    reasons: input.reasons,
    channel: input.channel,
  });
  if (error) throw error;
}

export async function fetchInstitutionCounselorAlertsSummary(
  client: SupabaseClient,
  institutionKey: string,
): Promise<InstitutionCounselorAlertsSummary | null> {
  const { data, error } = await client.rpc("get_institution_counselor_alerts_summary", {
    p_institution_key: institutionKey,
  });
  if (error) throw error;
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  return {
    alerts14d: Number(row.alerts_14d ?? 0),
    watchCount: Number(row.watch_count ?? 0),
    elevatedCount: Number(row.elevated_count ?? 0),
    autoCount: Number(row.auto_count ?? 0),
    manualCount: Number(row.manual_count ?? 0),
    lastAlertAt: typeof row.last_alert_at === "string" ? row.last_alert_at : null,
  };
}
