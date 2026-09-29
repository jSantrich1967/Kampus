import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeDuelCode, type DuelQuestion } from "@/lib/duels/types";

export const runtime = "nodejs";

const requestSchema = z.object({
  answers: z.array(z.number().int().min(0).max(3)).min(1).max(12),
  timeMs: z.number().int().min(0).max(30 * 60 * 1000),
  playerName: z.string().trim().max(60).default(""),
});

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeDuelCode(rawCode);
  if (!code) {
    return NextResponse.json({ error: "Código no válido." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: "Inicia sesión para jugar el duelo." }, { status: 401 });
    }

    const body = requestSchema.parse(await req.json().catch(() => ({})));

    const { data: duel, error } = await supabase.from("duels").select("*").eq("code", code).maybeSingle();
    if (error || !duel) {
      return NextResponse.json({ error: "No encontramos un duelo con ese código." }, { status: 404 });
    }

    const questions = duel.questions as DuelQuestion[];
    const score = questions.reduce(
      (acc, q, i) => acc + (body.answers[i] !== undefined && body.answers[i] === q.answerIndex ? 1 : 0),
      0,
    );

    const isCreator = duel.creator_id === user.id;
    const patch: Record<string, unknown> = isCreator
      ? {
          creator_score: score,
          creator_time_ms: body.timeMs,
          creator_name: body.playerName || duel.creator_name,
        }
      : {
          challenger_id: user.id,
          challenger_name: body.playerName || user.email?.split("@")[0] || "Retador",
          challenger_score: score,
          challenger_time_ms: body.timeMs,
          status: "done",
        };

    // Si el creador ya jugó y ahora juega el retador (o viceversa), el duelo queda completo.
    if (!isCreator && duel.creator_score !== null) {
      (patch as Record<string, unknown>).status = "done";
    }

    const { data: updated, error: updateError } = await supabase
      .from("duels")
      .update(patch)
      .eq("code", code)
      .select("*")
      .single();

    if (updateError || !updated) {
      return NextResponse.json({ error: "No pudimos guardar tu resultado." }, { status: 500 });
    }

    const { questions: _q, ...rest } = updated as { questions: DuelQuestion[] } & Record<string, unknown>;
    void _q;
    return NextResponse.json({ duel: rest, yourScore: score, total: questions.length });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos no válidos.", details: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
