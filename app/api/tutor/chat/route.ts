import { NextResponse } from "next/server";
import { z } from "zod";

import { planLimitMessage } from "@/lib/ai/ai-budget";
import { fetchOpenAi, runOpenAiRoute } from "@/lib/observability/openai-sentry";
import { extractResponsesOutputText } from "@/lib/openai/extract-responses-output-text";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { socraticTutorRateLimits } from "@/lib/rate-limit/openai-defaults";
import { consumeDailyUserQuota } from "@/lib/rate-limit/user-quota";

export const runtime = "nodejs";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8000),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(24),
  subject: z.string().max(120).default(""),
  level: z.enum(["school", "university"]).default("university"),
});

function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n\n…`;
}

function buildSystemPrompt(subject: string, level: string): string {
  const subjectLine = subject
    ? `MATERIA ACTUAL: ${subject}.`
    : "MATERIA ACTUAL: no indicada — pregúntala si hace falta para contextualizar.";
  const levelLine =
    level === "school"
      ? "NIVEL: secundaria/bachillerato — lenguaje sencillo, ejemplos cotidianos."
      : "NIVEL: universidad — rigor conceptual, pero siempre didáctico.";

  return clip(
    `Eres el Tutor IA de Kampus. Respondes SIEMPRE en español claro y cálido.

MÉTODO SOCRÁTICO (obligatorio):
- NUNCA entregues la respuesta directa a la primera. Guía con preguntas: una pregunta a la vez, la más útil para el siguiente paso del razonamiento.
- Empieza diagnosticando: ¿qué cree el estudiante? ¿dónde está el hueco? Pregunta antes de explicar.
- Cuando el estudiante responda, valida lo correcto, corrige con tacto lo incorrecto y avanza con la siguiente pregunta.
- Solo da la explicación completa cuando el estudiante ya intentó razonar (2-3 intercambios) o cuando lo pide explícitamente tras intentarlo.
- Si pide "hazme la tarea / resuelve el examen / dame la respuesta", no lo hagas: propón resolverlo JUNTOS paso a paso y empieza con la primera pregunta.
- Usa ejemplos, analogías y mini-retos ("¿qué pasaría si…?"). Párrafos cortos, listas cuando ayuden, máximo ~180 palabras por respuesta salvo que pidan más detalle.
- Celebra el progreso ("¡exacto!", "vas bien") — el refuerzo positivo es parte del método.
- Si la duda es de otra materia, adáptate sin problema.
- No sustituyes apoyo emocional profesional: si detectas angustia fuerte, sugiere pausar y hablar con alguien de confianza.

${subjectLine}
${levelLine}`,
    8000,
  );
}

export async function POST(req: Request) {
  const ip = getClientIpKey(req);
  const limits = socraticTutorRateLimits();
  const rl = tryConsumeRateToken(`socratic_tutor:${ip}`, limits.max, limits.windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const quota = await consumeDailyUserQuota(
    "socratic_tutor",
    parseInt(process.env.API_DAILY_LIMIT_SOCRATIC_TUTOR ?? "25", 10),
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

  try {
    return await runOpenAiRoute("socratic_tutor", async () => {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

      if (!apiKey) {
        return NextResponse.json(
          { error: "Falta OPENAI_API_KEY en el servidor para usar el Tutor IA." },
          { status: 400 },
        );
      }

      const body = requestSchema.parse(await req.json().catch(() => ({})));

      const last = body.messages[body.messages.length - 1];
      if (!last || last.role !== "user") {
        return NextResponse.json({ error: "El último mensaje debe ser del usuario." }, { status: 400 });
      }

      const systemText = buildSystemPrompt(body.subject.trim(), body.level);

      const openaiUrl = "https://api.openai.com/v1/responses";
      const openaiPayload = {
        model,
        input: [
          { role: "system" as const, content: [{ type: "input_text" as const, text: systemText }] },
          ...body.messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: [
              {
                type: (m.role === "assistant"
                  ? ("output_text" as "output_text" | "input_text")
                  : ("input_text" as "output_text" | "input_text")),
                text: clip(m.content, 8000),
              },
            ],
          })),
        ],
        temperature: 0.7,
        max_output_tokens: 1200,
      };

      const res = await fetchOpenAi("socratic_tutor", openaiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(openaiPayload),
      });

      if (!res.ok) {
        let message = "";
        try {
          const json = (await res.json()) as { error?: { message?: string } };
          message = json.error?.message ?? "";
        } catch {
          message = (await res.text()).slice(0, 400);
        }
        const planLimit = await planLimitMessage(res);
        if (planLimit) {
          return NextResponse.json({ error: planLimit }, { status: 429 });
        }
        if (res.status === 429) {
          return NextResponse.json(
            { error: "Sin cuota OpenAI ahora (429). Revisa facturación e inténtalo de nuevo." },
            { status: 429 },
          );
        }
        return NextResponse.json({ error: `OpenAI error (HTTP ${res.status}): ${message || "Unknown"}` }, { status: 502 });
      }

      const payload = (await res.json()) as unknown;
      const text = extractResponsesOutputText(payload);
      if (!text.trim()) {
        return NextResponse.json({ error: "La respuesta del modelo llegó vacía." }, { status: 502 });
      }

      return NextResponse.json({
        reply: text.trim(),
        quota: { used: quota.used, limit: quota.limit },
      });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Petición no válida.", details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
