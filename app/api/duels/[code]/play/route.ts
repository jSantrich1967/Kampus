import { NextResponse } from "next/server";
import { z } from "zod";

import { duelScorePatch } from "@/lib/duels/score-patch";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

    const admin = createSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "El duelo no está disponible ahora." }, { status: 503 });
    }
    const { data: duel, error } = await admin.from("duels").select("*").eq("code", code).maybeSingle();
    if (error || !duel) {
      return NextResponse.json({ error: "No encontramos un duelo con ese código." }, { status: 404 });
    }
    const { data: keyRow } = await admin
      .from("duel_answer_keys")
      .select("answers")
      .eq("duel_id", duel.id)
      .maybeSingle();
    const storedAnswers = Array.isArray(keyRow?.answers) ? (keyRow.answers as unknown[]) : [];
    const questions = (duel.questions as Array<{ question: string; options: string[]; answerIndex?: number }>).map(
      (q, i) => ({
        question: q.question,
        options: q.options,
        answerIndex: typeof storedAnswers[i] === "number" ? (storedAnswers[i] as number) : (q.answerIndex ?? -1),
      }),
    ) as DuelQuestion[];
    const score = questions.reduce(
      (acc, q, i) => acc + (body.answers[i] !== undefined && body.answers[i] === q.answerIndex ? 1 : 0),
      0,
    );

    const decision = duelScorePatch(
      {
        creator_id: duel.creator_id,
        challenger_id: duel.challenger_id,
        creator_score: duel.creator_score,
        creator_name: duel.creator_name,
      },
      user.id,
      score,
      body.timeMs,
      body.playerName || (duel.creator_id === user.id ? duel.creator_name : user.email?.split("@")[0] || "Retador"),
    );
    if (!decision.ok) {
      return NextResponse.json({ error: "No puedes modificar este duelo." }, { status: 403 });
    }

    const { data: updated, error: updateError } = await admin
      .from("duels")
      .update(decision.patch)
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
