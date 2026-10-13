import { NextResponse } from "next/server";

import { getServerUserPlan } from "@/lib/billing/server-plan";
import { dailyLimitForPlan, maxSecondsForPlan, type ServerPlan } from "@/lib/lecture/validate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * GET /api/lecture/limits
 * Límites de "Grabar clase" para la sesión actual (sin consumir cuota).
 * La UI los usa para el auto-stop del temporizador y los mensajes.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }

  const plan = (await getServerUserPlan(supabase, user.id)) as ServerPlan;
  const maxSeconds = maxSecondsForPlan(plan);

  return NextResponse.json({
    plan,
    maxSeconds,
    maxMinutes: Math.round(maxSeconds / 60),
    dailyLimit: dailyLimitForPlan(plan),
  });
}
