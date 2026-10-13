import { NextResponse } from "next/server";
import { z } from "zod";

import { topicScoreSchema } from "@/lib/schemas/cram";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const saveSchema = z.object({
  subject: z.string().trim().min(2).max(120),
  topics: z.array(topicScoreSchema).min(1).max(20),
});

/**
 * POST /api/cram/diagnose/save
 * Guarda el diagnóstico que el estudiante acaba de completar (los puntajes
 * por tema se calculan en el cliente, como hasta ahora). No bloquea nada:
 * si la tabla `cram_diagnoses` aún no existe en producción responde
 * { ok: true, saved: false } y el flujo sigue igual.
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }

  let body: z.infer<typeof saveSchema>;
  try {
    body = saveSchema.parse(await req.json().catch(() => ({})));
  } catch {
    return NextResponse.json({ error: "Datos del diagnóstico inválidos." }, { status: 400 });
  }

  const correct = body.topics.reduce((acc, t) => acc + t.correct, 0);
  const total = body.topics.reduce((acc, t) => acc + t.total, 0);

  try {
    const { error } = await supabase.from("cram_diagnoses").insert({
      user_id: user.id,
      subject: body.subject.trim(),
      topics: body.topics,
      correct,
      total,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true, saved: true });
  } catch {
    // Migración aún no aplicada en producción: degradar sin romper el flujo.
    return NextResponse.json({ ok: true, saved: false });
  }
}
