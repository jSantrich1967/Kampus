import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDueReviewItems, REVIEW_SESSION_LIMIT } from "@/lib/study/review-items";

export const runtime = "nodejs";

/**
 * GET /api/reviews/due
 * Cola de tarjetas vencidas para la sesión de repaso (máx. 20),
 * ordenadas por vencimiento. Solo lectura: no consume cuota ni IA.
 * Vacío si no hay pendientes o si la tabla aún no existe.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }

  const items = await getDueReviewItems(supabase, user.id);
  return NextResponse.json({ items, count: items.length, limit: REVIEW_SESSION_LIMIT });
}
