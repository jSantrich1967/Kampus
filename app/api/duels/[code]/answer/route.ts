import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { normalizeDuelCode, type DuelQuestion } from "@/lib/duels/types";

export const runtime = "nodejs";

const requestSchema = z.object({
  // -1 = se acabó el tiempo sin responder
  choiceIndex: z.number().int().min(-1).max(3),
});

/**
 * Valida UNA respuesta del duelo en el servidor y devuelve si fue correcta
 * más el índice correcto — solo de la pregunta que el jugador acaba de
 * responder y en el orden registrado en /start. El resto de la clave nunca
 * sale del servidor.
 */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeDuelCode(rawCode);
  if (!code) {
    return NextResponse.json({ error: "Código no válido." }, { status: 400 });
  }

  const ip = getClientIpKey(req);
  const rl = tryConsumeRateToken(`duel_answer:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Demasiadas peticiones. Espera un momento." }, { status: 429 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
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
    if (duel.creator_id !== user.id && duel.challenger_id && duel.challenger_id !== user.id) {
      return NextResponse.json({ error: "No puedes modificar este duelo." }, { status: 403 });
    }
    const isCreator = duel.creator_id === user.id;
    const orderCol = isCreator ? "creator_order" : "challenger_order";
    const progressCol = isCreator ? "creator_progress" : "challenger_progress";

    const order = (duel as Record<string, unknown>)[orderCol] as number[] | null;
    const progress = ((duel as Record<string, unknown>)[progressCol] as number) ?? 0;

    if (!order || order.length === 0) {
      return NextResponse.json({ error: "Inicia el duelo primero." }, { status: 400 });
    }
    if (progress < 0 || progress >= order.length) {
      return NextResponse.json({ error: "No hay más preguntas por responder." }, { status: 400 });
    }

    const questionIndex = order[progress];
    const question = questions[questionIndex];
    if (!question) {
      return NextResponse.json({ error: "Pregunta no válida." }, { status: 400 });
    }

    const correct = body.choiceIndex === question.answerIndex;

    const progressPatch: Record<string, unknown> = { [progressCol]: progress + 1 };
    if (duel.creator_id !== user.id && !duel.challenger_id) {
      progressPatch.challenger_id = user.id;
    }
    const { error: updateError } = await admin.from("duels").update(progressPatch).eq("code", code);
    if (updateError) {
      return NextResponse.json({ error: "No pudimos registrar tu respuesta." }, { status: 500 });
    }

    return NextResponse.json({ correct, correctIndex: question.answerIndex, questionIndex });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });
    }
    console.error("duel answer unexpected", err);
    return NextResponse.json({ error: "Ocurrió un error inesperado." }, { status: 500 });
  }
}
