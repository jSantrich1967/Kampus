import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchOpenAi, runOpenAiRoute } from "@/lib/observability/openai-sentry";
import { extractResponsesOutputText } from "@/lib/openai/extract-responses-output-text";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DUEL_QUESTION_COUNT, generateDuelCode, type DuelQuestion } from "@/lib/duels/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  subject: z.string().trim().min(2).max(120),
  topic: z.string().trim().max(200).default(""),
  playerName: z.string().trim().max(60).default(""),
  requestId: z.string().trim().max(64).default(""),
  materialImage: z.string().trim().max(4_500_000).refine((v) => v === "" || /^data:image\/(png|jpe?g|webp|gif);base64,/.test(v), {
      message: "Imagen no válida.",
    }).default(""),});

const duelQuestionSchema = z.object({
  question: z.string().min(4).max(500),
  options: z.array(z.string().min(1).max(200)).length(4),
  answerIndex: z.number().int().min(0).max(3),
});

function extractFirstBalancedJsonObject(input: string): string | null {
  const start = input.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < input.length; i += 1) {
    const c = input[i];
    if (inString) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inString = false;
    } else if (c === '"') {
      inString = true;
    } else if (c === "{") {
      depth += 1;
    } else if (c === "}") {
      depth -= 1;
      if (depth === 0) return input.slice(start, i + 1);
    }
  }
  return null;
}

async function generateDuelQuestions(
  subject: string,
  topic: string,
  materialImage: string,
): Promise<DuelQuestion[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
  if (!apiKey) throw new Error("missing_api_key");

  const hasImage = materialImage.length > 0;
  const topicLine = hasImage
    ? "Basa TODAS las preguntas en el contenido de la foto del material de estudio (lee con cuidado, incluida letra manuscrita). Si la foto no es legible o no es material de estudio, genera preguntas del tema de la materia de todos modos."
    : topic
      ? `Tema específico: ${topic}.`
      : "Cubre los conceptos esenciales de la materia.";
  const prompt = `Genera ${DUEL_QUESTION_COUNT} preguntas de opción múltiple para un duelo de quiz entre estudiantes.
Materia: ${subject}. ${topicLine}
Nivel: bachillerato/universidad básico. Preguntas claras, sin ambigüedad, con 4 opciones donde solo una es correcta.
Responde ÚNICAMENTE con un objeto JSON válido con esta forma exacta:
{"questions":[{"question":"...","options":["...","...","...","..."],"answerIndex":0}]}
Sin texto antes ni después del JSON.`;

  const userParts: Array<Record<string, unknown>> = [];
  if (hasImage) {
    userParts.push({
      type: "input_text",
      text: "--- Foto del material de estudio (léela con cuidado, incluida la letra manuscrita) ---",
    });
    userParts.push({ type: "input_image", image_url: materialImage, detail: "high" });
  }
  userParts.push({ type: "input_text", text: prompt });

  const res = await fetchOpenAi(
    "duel_create",
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        input: [{ role: "user", content: userParts }],
        temperature: 0.8,
        max_output_tokens: 2500,
      }),
    },
  );

  if (!res.ok) throw new Error(`openai_${res.status}`);
  const text = extractResponsesOutputText(await res.json());
  const jsonRaw = extractFirstBalancedJsonObject(text);
  if (!jsonRaw) throw new Error("bad_json");
  const parsed = z.object({ questions: z.array(duelQuestionSchema) }).parse(JSON.parse(jsonRaw));
  if (parsed.questions.length < 4) throw new Error("too_few");
  return parsed.questions.slice(0, DUEL_QUESTION_COUNT);
}

export async function POST(req: Request) {
  const ip = getClientIpKey(req);
  const rl = tryConsumeRateToken("duel_create", 10, 15 * 60 * 1000);
  void ip;
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    return await runOpenAiRoute("duel_create", async () => {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        return NextResponse.json({ error: "Inicia sesión para crear un duelo." }, { status: 401 });
      }

      const body = requestSchema.parse(await req.json().catch(() => ({})));

      // Idempotencia: si el cliente reintenta con el mismo requestId,
      // devolvemos el duelo ya creado en vez de generar preguntas de nuevo.
      if (body.requestId) {
        const { data: existing } = await supabase
          .from("duels")
          .select("code, subject, topic, questions")
          .eq("request_id", body.requestId)
          .eq("creator_id", user.id)
          .maybeSingle();
        if (existing) {
          return NextResponse.json({ duel: existing });
        }
      }

      let questions: DuelQuestion[];
      try {
        questions = await generateDuelQuestions(body.subject, body.topic, body.materialImage);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "unknown";
        if (msg === "missing_api_key") {
          return NextResponse.json({ error: "El generador de duelos no está configurado en el servidor." }, { status: 400 });
        }
        return NextResponse.json({ error: "No pudimos generar las preguntas. Inténtalo de nuevo." }, { status: 502 });
      }

      const code = generateDuelCode();
      const { data, error } = await supabase
        .from("duels")
        .insert({
          code,
          subject: body.subject,
          topic: body.topic,
          questions,
          creator_id: user.id,
          creator_name: body.playerName || user.email?.split("@")[0] || "Jugador 1",
          request_id: body.requestId || null,
        })
        .select("code, subject, topic, questions")
        .single();

      if (error || !data) {
        // Si otro intento con el mismo requestId ganó la carrera, devuelve ese duelo.
        if (body.requestId) {
          const { data: raced } = await supabase
            .from("duels")
            .select("code, subject, topic, questions")
            .eq("request_id", body.requestId)
            .eq("creator_id", user.id)
            .maybeSingle();
          if (raced) {
            return NextResponse.json({ duel: raced });
          }
        }
        return NextResponse.json(
          { error: "No pudimos guardar el duelo. ¿Ya ejecutaste la migración SQL de duelos en Supabase?" },
          { status: 500 },
        );
      }

      return NextResponse.json({ duel: data });
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos no válidos.", details: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
