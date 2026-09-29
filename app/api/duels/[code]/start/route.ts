import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { normalizeDuelCode, type DuelQuestion } from "@/lib/duels/types";

export const runtime = "nodejs";

const requestSchema = z.object({
  order: z.array(z.number().int().min(0)).min(1).max(12),
});

/**
 * Registra el orden (barajado) de preguntas con el que este jugador va a
 * jugar. El servidor lo usa para validar las respuestas una por una sin
 * exponer el resto de la clave: solo se revela la respuesta correcta de la
 * pregunta que el jugador acaba de responder, y en secuencia.
 */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeDuelCode(rawCode);
  if (!code) {
    return NextResponse.json({ error: "Código no válido." }, { status: 400 });
  }

  const ip = getClientIpKey(req);
  const rl = tryConsumeRateToken(`duel_start:${ip}`, 60, 60_000);
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

    const { data: duel, error } = await supabase.from("duels").select("*").eq("code", code).maybeSingle();
    if (error || !duel) {
      return NextResponse.json({ error: "No encontramos un duelo con ese código." }, { status: 404 });
    }

    const questions = duel.questions as DuelQuestion[];
    const n = questions.length;
    const sorted = [...body.order].sort((a, b) => a - b);
    const isPermutation =
      body.order.length === n && sorted.every((v, i) => v === i);
    if (!isPermutation) {
      return NextResponse.json({ error: "Orden de preguntas no válido." }, { status: 400 });
    }

    const isCreator = duel.creator_id === user.id;
    const orderCol = isCreator ? "creator_order" : "challenger_order";
    const progressCol = isCreator ? "creator_progress" : "challenger_progress";

    const existingOrder = (duel as Record<string, unknown>)[orderCol] as number[] | null;
    const existingProgress = ((duel as Record<string, unknown>)[progressCol] as number) ?? 0;

    // Si ya empezó a jugar con un orden, no puede cambiarlo a mitad de camino
    // (evita "reinicios" para espiar respuestas de otras preguntas).
    if (existingOrder && existingOrder.length > 0 && existingProgress > 0) {
      const same = existingOrder.length === body.order.length && existingOrder.every((v, i) => v === body.order[i]);
      if (!same) {
        return NextResponse.json({ error: "Ya empezaste este duelo con otro orden." }, { status: 409 });
      }
      return NextResponse.json({ ok: true, resumed: true });
    }

    const { error: updateError } = await supabase
      .from("duels")
      .update({ [orderCol]: body.order, [progressCol]: 0 })
      .eq("code", code);
    if (updateError) {
      return NextResponse.json({ error: "No pudimos iniciar el duelo." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });
    }
    console.error("duel start unexpected", err);
    return NextResponse.json({ error: "Ocurrió un error inesperado." }, { status: 500 });
  }
}
