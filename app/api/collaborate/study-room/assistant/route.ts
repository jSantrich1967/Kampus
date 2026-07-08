import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchOpenAi, runOpenAiRoute } from "@/lib/observability/openai-sentry";
import { extractResponsesOutputText } from "@/lib/openai/extract-responses-output-text";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { studyRoomAssistantRateLimits } from "@/lib/rate-limit/openai-defaults";
import { consumeDailyUserQuota } from "@/lib/rate-limit/user-quota";

export const runtime = "nodejs";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8000),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
  context: z.string().max(6000).optional(),
});

function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n\n…`;
}

const SYSTEM_ES = clip(
  `Eres un tutor de estudio en grupo para estudiantes de secundaria, bachillerato y universidad. Respondes SIEMPRE en español claro, breve y práctico.

Tu rol en la SALA DE ESTUDIO:
- Ayudar al equipo a cumplir la meta y la agenda de la sesión.
- Proponer pasos concretos, prioridades y técnicas de estudio (Pomodoro, Feynman, mapas mentales, preguntas de repaso).
- Desbloquear dudas conceptuales de forma pedagógica — guía con pistas antes de dar la respuesta directa.
- Resumir acuerdos si el equipo lo pide.
- NO hagas el trabajo completo del alumno (ensayos enteros, exámenes resueltos) — orienta el proceso.
- Si detectas bloqueo emocional fuerte, sugiere pausa o apoyo humano (no sustituyes bienestar clínico).

Estilo: párrafos cortos, listas cuando ayuden, máximo ~160 palabras salvo que pidan más detalle.`,
  8000,
);

export async function POST(req: Request) {
  const ip = getClientIpKey(req);
  const limits = studyRoomAssistantRateLimits();
  const rl = tryConsumeRateToken(`study_room_assistant:${ip}`, limits.max, limits.windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const quota = await consumeDailyUserQuota(
    "study_room_assistant",
    parseInt(process.env.API_DAILY_LIMIT_STUDY_ROOM_ASSISTANT ?? "15", 10),
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
    return await runOpenAiRoute("study_room_assistant", async () => {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

      if (!apiKey) {
        return NextResponse.json(
          { error: "Falta OPENAI_API_KEY en el servidor para usar el asistente de sala." },
          { status: 400 },
        );
      }

      const body = requestSchema.parse(await req.json().catch(() => ({})));

      const last = body.messages[body.messages.length - 1];
      if (!last || last.role !== "user") {
        return NextResponse.json({ error: "El último mensaje debe ser del usuario." }, { status: 400 });
      }

      const contextExtra = body.context?.trim();
      const systemText = contextExtra
        ? `${SYSTEM_ES}\n\nCONTEXTO DE LA SALA ACTUAL:\n${clip(contextExtra, 6000)}`
        : SYSTEM_ES;

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
        temperature: 0.6,
        max_output_tokens: 1200,
      };

      const res = await fetchOpenAi("study_room_assistant", openaiUrl, {
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
