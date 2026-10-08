import { NextResponse } from "next/server";

import { consumeDemoIpToken, isDemoCookieRequest } from "@/lib/demo/demo-request";
import { getServerUserPlan } from "@/lib/billing/server-plan";
import { fetchOpenAi, runOpenAiRoute } from "@/lib/observability/openai-sentry";
import { extractResponsesOutputText } from "@/lib/openai/extract-responses-output-text";
import { parseJsonFromModelText } from "@/lib/openai/parse-json-response";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { cramModeRateLimits } from "@/lib/rate-limit/openai-defaults";
import { consumeDailyUserQuota } from "@/lib/rate-limit/user-quota";
import {
  diagnoseQuestionSchema,
  diagnoseRequestSchema,
} from "@/lib/schemas/cram";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const QUESTION_COUNT = 6;

export async function POST(req: Request) {
  const ip = getClientIpKey(req);
  const limits = cramModeRateLimits();
  const rl = tryConsumeRateToken(`cram_mode:${ip}`, limits.max, limits.windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const plan = await getServerUserPlan(supabase, user.id);
    if (plan !== "premium") {
      // Probada: 1 diagnóstico gratis al día con cuenta Estudiante. El plan
      // de estudio que sigue sí es de Pro (lo cobra /api/cram/plan).
      const taste = await consumeDailyUserQuota(
        "cram_diagnose_free",
        parseInt(process.env.API_FREE_CRAM_DIAGNOSES ?? "1", 10),
      );
      if (!taste.ok) {
        return NextResponse.json(
          { error: "Ya usaste tu diagnóstico gratis de hoy.", code: "TASTE_EXHAUSTED" },
          { status: 403 },
        );
      }
    } else {
    const quota = await consumeDailyUserQuota(
      "cram_mode",
      parseInt(process.env.API_DAILY_LIMIT_CRAM_MODE ?? "10", 10),
    );
    if (!quota.ok) {
      return NextResponse.json(
        { error: quota.message },
        {
          status: quota.status,
          headers:
            quota.status === 429 && quota.retryAfterSec
              ? { "Retry-After": String(quota.retryAfterSec) }
              : undefined,
        },
      );
    }
    }
  } else {
    // La demo pública puede probar el diagnóstico una vez por IP y día;
    // sin cookie demo o sin cupo, sí pedimos cuenta.
    if (!isDemoCookieRequest(req) || !consumeDemoIpToken(req, "cram_diagnose")) {
      return NextResponse.json(
        { error: "Crea tu cuenta gratis para seguir usando el modo examen." },
        { status: 401 },
      );
    }
  }

  try {
    return await runOpenAiRoute("cram_mode_diagnose", async () => {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
      if (!apiKey) {
        return NextResponse.json(
          { error: "El modo examen no está activado en este servidor (falta OPENAI_API_KEY)." },
          { status: 400 },
        );
      }

      let body: { subject: string; topics: string };
      try {
        body = diagnoseRequestSchema.parse(await req.json().catch(() => ({})));
      } catch {
        return NextResponse.json({ error: "Indica la materia del examen." }, { status: 400 });
      }

      const topicsLine = body.topics.trim()
        ? `Temas del examen (reparte las preguntas entre ellos): ${body.topics.trim()}.`
        : "Identifica tú los 3-4 subtemas más importantes de la materia y reparte las preguntas entre ellos.";

      const prompt = `Genera ${QUESTION_COUNT} preguntas de opción múltiple para un DIAGNÓSTICO RÁPIDO antes de un examen.
Materia: ${body.subject}. ${topicsLine}
Nivel: bachillerato/universidad básico. Cada pregunta debe revelar si el estudiante domina ese subtema: apunta a los errores típicos.
Cada pregunta lleva el subtema al que pertenece en "topic" (nombre corto, 2-4 palabras).
Responde ÚNICAMENTE con un objeto JSON válido con esta forma exacta:
{"questions":[{"topic":"...","question":"...","options":["...","...","...","..."],"answerIndex":0}]}
Sin texto antes ni después del JSON.`;

      const res = await fetchOpenAi("cram_mode_diagnose", "https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
          temperature: 0.7,
          max_output_tokens: 2200,
        }),
      }, { skipBudgetGate: !user });

      if (!res.ok) {
        console.error("cram diagnose openai error", res.status);
        return NextResponse.json(
          { error: "No se pudo generar el diagnóstico. Inténtalo de nuevo." },
          { status: 502 },
        );
      }

      const raw = extractResponsesOutputText(await res.json().catch(() => null));
      const parsed = parseJsonFromModelText(raw) as { questions?: unknown[] };
      const questions = (parsed.questions ?? []).slice(0, QUESTION_COUNT);
      const valid = questions.every((q) => diagnoseQuestionSchema.safeParse(q).success);
      if (questions.length === 0 || !valid) {
        return NextResponse.json(
          { error: "La IA devolvió un diagnóstico inválido. Inténtalo de nuevo." },
          { status: 502 },
        );
      }

      // Nota de diseño: el diagnóstico es autoevaluación honesta (engañarse solo
      // perjudica al estudiante), así que las respuestas viajan al cliente para
      // calificar al instante. Los duelos, que sí son competitivos, mantienen
      // la corrección en el servidor.
      const withAnswers = questions.map((q) => diagnoseQuestionSchema.parse(q));

      return NextResponse.json({ questions: withAnswers });
    });
  } catch (e) {
    console.error("cram diagnose unexpected", e);
    return NextResponse.json({ error: "Ocurrió un error inesperado." }, { status: 500 });
  }
}
