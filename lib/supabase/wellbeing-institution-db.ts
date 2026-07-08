import type { SupabaseClient } from "@supabase/supabase-js";

import type { InstitutionWellbeingPulse } from "@/lib/wellbeing/institution-pulse-build";

export type InstitutionPulseAggregate = {
  sampleSize: number;
  avgEntries7d: number | null;
  avgEnergy7d: number | null;
  avgLowMoodDays: number | null;
  avgStressTags: number | null;
  elevatedCount: number;
  watchCount: number;
};

export async function upsertWellbeingInstitutionContribution(
  client: SupabaseClient,
  userId: string,
  institutionKey: string,
  weekStart: string,
  pulse: InstitutionWellbeingPulse,
): Promise<void> {
  const { error } = await client.from("wellbeing_institution_contributions").upsert(
    {
      user_id: userId,
      institution_key: institutionKey,
      week_start: weekStart,
      pulse,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,week_start" },
  );
  if (error) throw error;
}

export async function fetchInstitutionWellbeingPulse(
  client: SupabaseClient,
  institutionKey: string,
): Promise<InstitutionPulseAggregate | null> {
  const { data, error } = await client.rpc("get_institution_wellbeing_pulse", {
    p_institution_key: institutionKey,
  });
  if (error) throw error;
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  return {
    sampleSize: Number(row.sample_size ?? 0),
    avgEntries7d: row.avg_entries_7d != null ? Number(row.avg_entries_7d) : null,
    avgEnergy7d: row.avg_energy_7d != null ? Number(row.avg_energy_7d) : null,
    avgLowMoodDays: row.avg_low_mood_days != null ? Number(row.avg_low_mood_days) : null,
    avgStressTags: row.avg_stress_tags != null ? Number(row.avg_stress_tags) : null,
    elevatedCount: Number(row.elevated_count ?? 0),
    watchCount: Number(row.watch_count ?? 0),
  };
}

export async function deleteWellbeingInstitutionContribution(
  client: SupabaseClient,
  userId: string,
  weekStart: string,
): Promise<void> {
  const { error } = await client
    .from("wellbeing_institution_contributions")
    .delete()
    .eq("user_id", userId)
    .eq("week_start", weekStart);
  if (error) throw error;
}

export type InstitutionPulseWeekTrend = {
  weekStart: string;
  sampleSize: number;
  avgEntries7d: number | null;
  avgEnergy7d: number | null;
  watchCount: number;
  elevatedCount: number;
};

export type InstitutionRiskBreakdown = {
  sampleSize: number;
  okCount: number;
  watchCount: number;
  elevatedCount: number;
  avgLowMoodDays: number | null;
  avgStressTags: number | null;
};

export async function fetchInstitutionWellbeingPulseTrends(
  client: SupabaseClient,
  institutionKey: string,
): Promise<InstitutionPulseWeekTrend[]> {
  const { data, error } = await client.rpc("get_institution_wellbeing_pulse_trends", {
    p_institution_key: institutionKey,
  });
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      weekStart: String(r.week_start ?? ""),
      sampleSize: Number(r.sample_size ?? 0),
      avgEntries7d: r.avg_entries_7d != null ? Number(r.avg_entries_7d) : null,
      avgEnergy7d: r.avg_energy_7d != null ? Number(r.avg_energy_7d) : null,
      watchCount: Number(r.watch_count ?? 0),
      elevatedCount: Number(r.elevated_count ?? 0),
    };
  });
}

export async function fetchInstitutionWellbeingRiskBreakdown(
  client: SupabaseClient,
  institutionKey: string,
): Promise<InstitutionRiskBreakdown | null> {
  const { data, error } = await client.rpc("get_institution_wellbeing_risk_breakdown", {
    p_institution_key: institutionKey,
  });
  if (error) throw error;
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  return {
    sampleSize: Number(row.sample_size ?? 0),
    okCount: Number(row.ok_count ?? 0),
    watchCount: Number(row.watch_count ?? 0),
    elevatedCount: Number(row.elevated_count ?? 0),
    avgLowMoodDays: row.avg_low_mood_days != null ? Number(row.avg_low_mood_days) : null,
    avgStressTags: row.avg_stress_tags != null ? Number(row.avg_stress_tags) : null,
  };
}
