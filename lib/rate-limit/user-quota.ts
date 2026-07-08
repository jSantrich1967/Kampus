import { isAuthRouteProtectionEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type QuotaResult =
  | { ok: true; used: number; limit: number; resetAtIso: string }
  | { ok: false; status: 401 | 429; message: string; retryAfterSec?: number; resetAtIso?: string };

function secondsUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(1, Math.ceil(ms / 1000));
}

export async function consumeDailyUserQuota(
  quotaKey: string,
  dailyLimit: number,
): Promise<QuotaResult> {
  /** Local/preview demo: OpenAI routes work with OPENAI_API_KEY only (no Supabase session). */
  if (!isAuthRouteProtectionEnabled()) {
    return {
      ok: true,
      used: 0,
      limit: dailyLimit,
      resetAtIso: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return {
      ok: false,
      status: 401,
      message: "Inicia sesión para usar esta función con IA.",
    };
  }

  const { data, error } = await supabase.rpc("consume_api_quota", {
    p_quota_key: quotaKey,
    p_daily_limit: dailyLimit,
  });

  if (error) {
    const raw = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
    if (raw.includes("unauthenticated")) {
      return { ok: false, status: 401, message: "Inicia sesión para usar esta función con IA." };
    }
    return { ok: false, status: 429, message: "No pudimos validar tu cuota ahora. Inténtalo de nuevo." };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const allowed = Boolean(row?.allowed);
  const used = typeof row?.used === "number" ? row.used : NaN;
  const limit = typeof row?.daily_limit === "number" ? row.daily_limit : dailyLimit;
  const resetAtIso = typeof row?.reset_at === "string" ? row.reset_at : new Date().toISOString();

  if (!allowed) {
    const retryAfterSec = secondsUntil(resetAtIso);
    return {
      ok: false,
      status: 429,
      message: "Has alcanzado el límite diario de uso de IA. Vuelve a intentarlo mañana.",
      retryAfterSec,
      resetAtIso,
    };
  }

  return { ok: true, used: Number.isFinite(used) ? used : 0, limit, resetAtIso };
}

