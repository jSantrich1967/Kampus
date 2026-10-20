import { NextResponse } from "next/server";

import { getServerUserPlan } from "@/lib/billing/server-plan";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Gratis: 1 sesión al día. Pro: p_daily_limit null, sin cupo.
 * La función SQL elige las tarjetas y, si ya hay sesión hoy, devuelve la misma.
 */
const FREE_DAILY_SESSIONS = parseInt(process.env.API_DAILY_LIMIT_REVIEW_SESSION ?? "1", 10);

type SessionRow = { session_id: string; item_ids: string[] | null; created: boolean };

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }

  const plan = await getServerUserPlan(supabase, user.id);
  const { data, error } = await supabase.rpc("start_review_session", {
    p_daily_limit: plan === "premium" ? null : FREE_DAILY_SESSIONS,
  });

  if (error) {
    if (String(error.message).includes("review_session_exhausted")) {
      return NextResponse.json(
        {
          error:
            "Ya usaste tu sesión de repaso gratis de hoy. Con Pro ($5/mes), las sesiones de repaso son ilimitadas.",
          code: "REVIEW_SESSION_EXHAUSTED",
        },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "No se pudo abrir la sesión de repaso. Inténtalo de nuevo." },
      { status: 500 },
    );
  }

  const row = (Array.isArray(data) ? data[0] : data) as SessionRow | null;
  const ids = Array.isArray(row?.item_ids) ? row.item_ids : [];
  if (!row?.session_id) {
    return NextResponse.json({ error: "No se pudo abrir la sesión de repaso." }, { status: 500 });
  }

  const { data: cards, error: cardError } = ids.length
    ? await supabase.from("review_items").select("id, subject, topic, front, back").in("id", ids).eq("user_id", user.id)
    : { data: [], error: null };
  if (cardError) {
    return NextResponse.json({ error: "No se pudieron leer las tarjetas de la sesión." }, { status: 500 });
  }

  const byId = new Map((cards ?? []).map((card) => [card.id as string, card]));
  const items = ids.map((id) => byId.get(id)).filter((card) => card !== undefined);

  return NextResponse.json({
    ok: true,
    unlimited: plan === "premium",
    resumed: row.created === false,
    sessionId: row.session_id,
    items,
  });
}
