import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { gradeReviewItem } from "@/lib/study/review-items";

export const runtime = "nodejs";

const gradeSchema = z.object({
  item_id: z.string().uuid(),
  quality: z.number().int().min(0).max(5),
  session_id: z.string().uuid(),
  grade_token: z.string().min(8).max(80),
});

/**
 * POST /api/reviews/grade { item_id, quality 0..5 }
 * Aplica SM-2 a la tarjeta y persiste el nuevo estado.
 * Matemática local, sin IA: no consume presupuesto de IA.
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }

  const parsed = gradeSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabase
    .from("review_sessions")
    .select("item_ids")
    .eq("id", parsed.data.session_id)
    .eq("user_id", user.id)
    .maybeSingle();
  const allowedIds = Array.isArray(session?.item_ids) ? (session.item_ids as string[]) : [];
  if (sessionError || !allowedIds.includes(parsed.data.item_id)) {
    return NextResponse.json(
      { error: "Esa tarjeta no pertenece a la sesión abierta.", code: "SESSION_REQUIRED" },
      { status: 403 },
    );
  }

  const graded = await gradeReviewItem(
    supabase,
    user.id,
    parsed.data.item_id,
    parsed.data.quality,
    parsed.data.grade_token,
  );
  if (!graded) {
    return NextResponse.json(
      { error: "No se pudo calificar la tarjeta. Inténtalo de nuevo." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    id: graded.id,
    intervalDays: graded.intervalDays,
    nextDue: graded.nextDue.toISOString(),
  });
}
