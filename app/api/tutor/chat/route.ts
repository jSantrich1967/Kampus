import { NextResponse } from "next/server";
import { z } from "zod";

import { planLimitMessage } from "@/lib/ai/ai-budget";
import { getLatestDiagnosis } from "@/lib/cram/diagnoses";
import { consumeDemoIpToken, isDemoCookieRequest } from "@/lib/demo/demo-request";
import { getServerUserPlan } from "@/lib/billing/server-plan";
import { fetchOpenAi, runOpenAiRoute } from "@/lib/observability/openai-sentry";
import { extractResponsesOutputText } from "@/lib/openai/extract-responses-output-text";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { socraticTutorRateLimits } from "@/lib/rate-limit/openai-defaults";
import { consumeDailyUserQuota, refundDailyUserQuotaForCurrentUser } from "@/lib/rate-limit/user-quota";
import { topicScoreSchema } from "@/lib/schemas/cram";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8000),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(24),
  subject: z.string().max(120).default(""),
  level: z.enum(["school", "university"]).default("university"),
  /** Opcional: el cliente puede enviar el último diagnóstico guardado; si no,
   * el servidor lo busca en cram_diagnoses para la materia indicada. */
  diagnostic: z.array(topicScoreSchema).max(20).optional(),
  /** Opcional: texto extraído del cuaderno (máx 6000 chars; el servidor lo recorta). */
  notebookContext: z.string().max(6000).optional(),
});

function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n\n…`;
}

function buildStudyContext(
  subject: string,
  diagnostic: Array<{ topic: string; correct: number; total: number }> | null,
  notebookContext: string,
): string {
  const parts: string[] = [];
  if (diagnostic && diagnostic.length > 0) {
    const lines = diagnostic.map((d) => {
      const weak = d.correct < d.total ? " — TEMA DÉBIL" : "";
      return `- ${d.topic}: ${d.correct}/${d.total} correctas${weak}`;
    });
    parts.push(
      [
        `CONTEXTO DEL ÚLTIMO DIAGNÓSTICO${subject ? ` (${subject})` : ""}:`,
        ...lines,
        "Úsalo para enfocar tus preguntas socráticas primero en los temas débiles y solo repasar ligero lo dominado.",
      ].join("\n"),
    );
  }
  if (notebookContext) {
    parts.push(
      [
        "MATERIAL DEL CUADERNO DEL ESTUDIANTE (extracto de sus apuntes):",
        clip(notebookContext, 4000),
        "Cuando sea relevante, basa tus ejemplos, analogías y preguntas en este material.",
      ].join("\n"),
    );
  }
  return parts.join("\n\n");
}

function buildSystemPrompt(subject: string, level: string, studyContext: string): string {
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
${levelLine}${studyContext ? `\n\n${studyContext}` : ""}`,
    14000,
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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let quota: { used: number; limit: number };
  let taste = false;
  // Clave de cuota usada en esta petición (para reembolsar si la IA falla
  // después de consumir: la cuota cuenta respuestas, no intentos).
  let quotaKey: string | null = null;
  if (user) {
    const plan = await getServerUserPlan(supabase, user.id);
    // Probada gratis: quien tiene cuenta y plan Estudiante puede sentir el
    // Tutor antes de pagar (3 preguntas al día). Al agotarla, la interfaz
    // muestra la tarjeta de Pro en vez de un error seco.
    taste = plan !== "premium";
    quotaKey = taste ? "socratic_tutor_free" : "socratic_tutor";
    const q = await consumeDailyUserQuota(
      quotaKey,
      taste
        ? parseInt(process.env.API_FREE_TUTOR_DAILY ?? "3", 10)
        : parseInt(process.env.API_DAILY_LIMIT_SOCRATIC_TUTOR ?? "25", 10),
    );
    if (!q.ok) {
      if (taste) {
        return NextResponse.json(
          { error: "Ya usaste tu probada gratis del Tutor de hoy.", code: "TASTE_EXHAUSTED" },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { error: q.message },
        {
          status: q.status,
          headers:
            q.status === 429 && q.retryAfterSec
              ? { "Retry-After": String(q.retryAfterSec) }
              : undefined,
        },
      );
    }
    quota = { used: q.used, limit: q.limit };
  } else {
    // La demo pública puede probar el Tutor con cupo corto por IP y día.
    if (!isDemoCookieRequest(req) || !consumeDemoIpToken(req, "tutor_chat")) {
      return NextResponse.json(
        { error: "Crea tu cuenta gratis para usar el Tutor IA." },
        { status: 401 },
      );
    }
    quota = { used: 0, limit: 0 };
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

      // Contexto real: diagnóstico guardado (el del request, o el último de
      // la materia en BD) + texto del cuaderno si el cliente lo envía.
      let diagnostic = body.diagnostic ?? null;
      if (!diagnostic && user && body.subject.trim()) {
        diagnostic = (await getLatestDiagnosis(supabase, user.id, body.subject.trim()))?.topics ?? null;
      }
      const studyContext = buildStudyContext(
        body.subject.trim(),
        diagnostic,
        (body.notebookContext ?? "").trim(),
      );
      const systemText = buildSystemPrompt(body.subject.trim(), body.level, studyContext);

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
      }, { skipBudgetGate: !user });

      if (!res.ok) {
        // planLimitMessage clona la respuesta: debe llamarse ANTES de leer el
        // body, o el mensaje específico del límite se pierde (genérico).
        const planLimit = await planLimitMessage(res);
        if (planLimit) {
          if (quotaKey) await refundDailyUserQuotaForCurrentUser(quotaKey);
          return NextResponse.json({ error: planLimit }, { status: 429 });
        }
        let message = "";
        try {
          const json = (await res.json()) as { error?: { message?: string } };
          message = json.error?.message ?? "";
        } catch {
          message = (await res.text()).slice(0, 400);
        }
        if (res.status === 429) {
          if (quotaKey) await refundDailyUserQuotaForCurrentUser(quotaKey);
          return NextResponse.json(
            { error: "Sin cuota OpenAI ahora (429). Revisa facturación e inténtalo de nuevo." },
            { status: 429 },
          );
        }
        if (quotaKey) await refundDailyUserQuotaForCurrentUser(quotaKey);
        return NextResponse.json({ error: `OpenAI error (HTTP ${res.status}): ${message || "Unknown"}` }, { status: 502 });
      }

      const payload = (await res.json()) as unknown;
      const text = extractResponsesOutputText(payload);
      if (!text.trim()) {
        if (quotaKey) await refundDailyUserQuotaForCurrentUser(quotaKey);
        return NextResponse.json({ error: "La respuesta del modelo llegó vacía." }, { status: 502 });
      }

      return NextResponse.json({
        reply: text.trim(),
        quota: { used: quota.used, limit: quota.limit },
        plan: user ? (taste ? "free" : "premium") : "demo",
      });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (err instanceof z.ZodError) {
      if (quotaKey) await refundDailyUserQuotaForCurrentUser(quotaKey);
      return NextResponse.json({ error: "Petición no válida.", details: err.flatten() }, { status: 400 });
    }
    if (quotaKey) await refundDailyUserQuotaForCurrentUser(quotaKey);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
