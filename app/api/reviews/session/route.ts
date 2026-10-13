import { NextResponse } from "next/server";

import { getServerUserPlan } from "@/lib/billing/server-plan";
import { consumeDailyUserQuota } from "@/lib/rate-limit/user-quota";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Gating de sesiones de repaso (decidido en servidor):
 * - Gratis: 1 sesión al día (hasta 20 tarjetas por sesión).
 * - Pro: sesiones ilimitadas.
 *
 * Para cambiar la regla con una palabra: ajusta FREE_DAILY_SESSIONS
 * (0 = sin sesiones gratis) o la rama de premium.
 */
const FREE_DAILY_SESSIONS = parseInt(process.env.API_DAILY_LIMIT_REVIEW_SESSION ?? "1", 10);

/**
 * POST /api/reviews/session
 * Abre una sesión de repaso. Las cuentas gratis consumen su sesión
 * diaria aquí; Pro pasa directo.
 */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }

  const plan = await getServerUserPlan(supabase, user.id);
  if (plan === "premium") {
    return NextResponse.json({ ok: true, unlimited: true });
  }

  const quota = await consumeDailyUserQuota("review_session", FREE_DAILY_SESSIONS);
  if (!quota.ok) {
    return NextResponse.json(
      {
        error:
          "Ya usaste tu sesión de repaso gratis de hoy. Con Pro ($5/mes), las sesiones de repaso son ilimitadas.",
        code: "REVIEW_SESSION_EXHAUSTED",
      },
      {
        status: quota.status,
        headers:
          quota.status === 429 && quota.retryAfterSec
            ? { "Retry-After": String(quota.retryAfterSec) }
            : undefined,
      },
    );
  }

  return NextResponse.json({ ok: true, unlimited: false });
}
