import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface StudyStreak {
  current: number;
  longest: number;
  total: number;
  days: string[];
}

export async function getStudyStreak(client: SupabaseClient): Promise<StudyStreak | null> {
  const { data, error } = await client.rpc("get_study_streak");
  if (error) return null;
  const row = data as { ok?: boolean; current?: number; longest?: number; total?: number; days?: string[] } | null;
  if (!row || !row.ok) return null;
  return {
    current: Number(row.current ?? 0),
    longest: Number(row.longest ?? 0),
    total: Number(row.total ?? 0),
    days: Array.isArray(row.days) ? row.days : [],
  };
}

/**
 * Registra actividad de estudio de hoy. Fire-and-forget: nunca lanza,
 * para no romper el flujo del usuario si la red o la sesión fallan.
 */
export function logStudyActivity(kind: string): void {
  try {
    if (!isSupabaseConfigured()) return;
    const supabase = createSupabaseBrowserClient();
    void Promise.resolve(supabase.rpc("log_study_day", { p_kind: kind }))
      .then(() => undefined)
      .catch(() => undefined);
  } catch {
    /* silencioso */
  }
}
