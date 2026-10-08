import { NextResponse } from "next/server";

import { consumeDemoIpToken, isDemoCookieRequest } from "@/lib/demo/demo-request";
import { getServerUserPlan, PRO_ONLY_MESSAGE } from "@/lib/billing/server-plan";
import { fetchOpenAi, runOpenAiRoute } from "@/lib/observability/openai-sentry";
import { extractResponsesOutputText } from "@/lib/openai/extract-responses-output-text";
import { parseJsonFromModelText } from "@/lib/openai/parse-json-response";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { cramModeRateLimits } from "@/lib/rate-limit/openai-defaults";
import { consumeDailyUserQuota } from "@/lib/rate-limit/user-quota";
import { planRequestSchema, planResultSchema } from "@/lib/schemas/cram";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
      return NextResponse.json({ error: PRO_ONLY_MESSAGE, code: "PRO_REQUIRED" }, { status: 403 });
    }
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
  } else {
    // La demo pública puede generar su plan una vez por IP y día.
    if (!isDemoCookieRequest(req) || !consumeDemoIpToken(req, "cram_plan")) {
      return NextResponse.json(
        { error: "Crea tu cuenta gratis para seguir usando el modo examen." },
        { status: 401 },
      );
    }
  }

  try {
    return await runOpenAiRoute("cram_mode_plan", async () => {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
      if (!apiKey) {
        return NextResponse.json(
          { error: "El modo examen no está activado en este servidor (falta OPENAI_API_KEY)." },
          { status: 400 },
        );
      }

      let body: {
        subject: string;
        daysLeft: number;
        hoursPerDay: number;
        topics: string;
        diagnostic: Array<{ topic: string; correct: number; total: number }>;
      };
      try {
        body = planRequestSchema.parse(await req.json().catch(() => ({})));
      } catch {
        return NextResponse.json({ error: "Faltan datos del diagnóstico para armar el plan." }, { status: 400 });
      }

      const totalMinutes = Math.round(body.daysLeft * body.hoursPerDay * 60);
      const diagLines = body.diagnostic
        .map((d) => `- ${d.topic}: ${d.correct}/${d.total} correctas`)
        .join("\n");

      const keys = Object.keys(planResultSchema.shape).join(", ");
      const prompt = `Eres un tutor experto armando un plan de repaso de emergencia antes de un examen.
Materia: ${body.subject}.
Días hasta el examen: ${body.daysLeft}. Horas de estudio por día: ${body.hoursPerDay} (total ${totalMinutes} minutos).
${body.topics.trim() ? `Temas del examen: ${body.topics.trim()}.` : ""}
Resultado del diagnóstico del estudiante (mientras más bajo el puntaje, más débil el tema):
${diagLines}

Arma el plan con estas reglas:
- Los temas MÁS DÉBILES van primero y reciben más minutos. Los temas dominados solo llevan repaso ligero.
- El ÚLTIMO día incluye un simulacro final (kind "mock") y repaso ligero, nada nuevo pesado.
- Si solo queda 1 día, todo es hoy: primero lo débil, luego práctica, cierra con mini-simulacro.
- Cada bloque: título claro, "why" de UNA frase que conecte con su diagnóstico ("fallaste 2/3 en…"), minutos realistas, y 2-4 acciones concretas y cortas (p. ej. "Pídele al tutor que te explique X con un ejemplo", "Juega un duelo de práctica de este tema", "Resume en voz alta los 3 puntos clave").
- kind: "study" (estudiar tema), "practice" (ejercicios/duelo), "mock" (simulacro), "review" (repaso ligero).
- La suma de minutos debe acercarse al total disponible (${totalMinutes} min).
Responde ÚNICAMENTE con un objeto JSON válido con esta forma exacta:
{"headline":"...","blocks":[{"day":1,"title":"...","why":"...","minutes":45,"actions":["..."],"kind":"study"}]}
headline: UNA frase motivadora y directa que resuma la estrategia (máx 140 caracteres).
Sin texto antes ni después del JSON.`;

      const res = await fetchOpenAi("cram_mode_plan", "https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
          temperature: 0.7,
          max_output_tokens: 2500,
        }),
      }, { skipBudgetGate: !user });

      if (!res.ok) {
        console.error("cram plan openai error", res.status);
        return NextResponse.json(
          { error: "No se pudo armar el plan. Inténtalo de nuevo." },
          { status: 502 },
        );
      }

      const raw = extractResponsesOutputText(await res.json().catch(() => null));
      const parsed = parseJsonFromModelText(raw);
      const result = planResultSchema.safeParse(parsed);
      if (!result.success) {
        return NextResponse.json(
          { error: "La IA devolvió un plan inválido. Inténtalo de nuevo." },
          { status: 502 },
        );
      }

      return NextResponse.json({ plan: result.data });
    });
  } catch (e) {
    console.error("cram plan unexpected", e);
    return NextResponse.json({ error: "Ocurrió un error inesperado." }, { status: 500 });
  }
}
