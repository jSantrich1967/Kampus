import { NextResponse } from "next/server";

import { getLatestDiagnosesBySubject } from "@/lib/cram/diagnoses";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRecentReviewTopicStats } from "@/lib/study/review-items";
import { computeTopicMastery } from "@/lib/study/topic-mastery";

export const runtime = "nodejs";

/**
 * GET /api/reviews/mastery
 * Tablero de dominio por tema: combina el último diagnóstico guardado
 * por materia (60%) con el desempeño en repasos de los últimos 30 días
 * (40%). pct = null significa "sin datos": la UI nunca inventa un %.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }

  const [diagnoses, reviewStats] = await Promise.all([
    getLatestDiagnosesBySubject(supabase, user.id),
    getRecentReviewTopicStats(supabase, user.id, 30),
  ]);

  const subjects = computeTopicMastery(
    diagnoses.flatMap((d) =>
      d.topics.map((t) => ({ subject: d.subject, topic: t.topic, correct: t.correct, total: t.total })),
    ),
    reviewStats,
  );

  return NextResponse.json({ subjects });
}
