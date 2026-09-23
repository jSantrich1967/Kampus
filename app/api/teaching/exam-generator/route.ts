import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchOpenAi, runOpenAiRoute } from "@/lib/observability/openai-sentry";
import { extractResponsesOutputText } from "@/lib/openai/extract-responses-output-text";
import { parseJsonFromModelText } from "@/lib/openai/parse-json-response";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { examGeneratorRateLimits } from "@/lib/rate-limit/openai-defaults";
import { consumeDailyUserQuota } from "@/lib/rate-limit/user-quota";
import {
  examGeneratorRequestSchema,
  generatedExamSchema,
} from "@/lib/schemas/exam-generator";

export const runtime = "nodejs";

const TYPE_LABELS: Record<string, string> = {
  mixto: "una mezcla de opción múltiple, verdadero/falso y preguntas de desarrollo",
  opcion_multiple: "solo preguntas de opción múltiple (4 opciones cada una)",
  verdadero_falso: "solo preguntas de verdadero o falso (con justificación)",
  desarrollo: "solo preguntas de desarrollo (respuesta abierta)",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  facil: "fácil (recordar y comprender)",
  medio: "medio (aplicar y analizar)",
  dificil: "difícil (evaluar y crear, problemas no triviales)",
};

export async function POST(req: Request) {
  const ip = getClientIpKey(req);
  const limits = examGeneratorRateLimits();
  const rl = tryConsumeRateToken(`exam_generator:${ip}`, limits.max, limits.windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const quota = await consumeDailyUserQuota(
    "exam_generator",
    parseInt(process.env.API_DAILY_LIMIT_EXAM_GENERATOR ?? "10", 10),
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
    return await runOpenAiRoute("exam_generator", async () => {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

      if (!apiKey) {
        return NextResponse.json(
          { error: "La generación con IA no está activada en este servidor (falta OPENAI_API_KEY)." },
          { status: 400 },
        );
      }

      let body: z.infer<typeof examGeneratorRequestSchema>;
      try {
        body = examGeneratorRequestSchema.parse(await req.json().catch(() => ({})));
      } catch {
        return NextResponse.json(
          { error: "Revisa el formulario: materia y tema son obligatorios." },
          { status: 400 },
        );
      }

      const keys = Object.keys(generatedExamSchema.shape).join(", ");

      const system = [
        "Eres un docente experto que diseña exámenes claros y justos.",
        "Hablas español cotidiano y sencillo, sin jerga académica innecesaria.",
        "Las preguntas deben evaluar comprensión real, no memoria mecánica: incluye aplicación a casos y ejemplos cercanos a la vida del estudiante.",
        "Responde SOLO con un JSON válido (sin markdown, sin texto fuera del objeto). El último carácter debe ser `}`.",
      ].join(" ");

      const userText = [
        `Materia: ${body.subject}`,
        `Tema del examen: ${body.topic}`,
        `Cantidad de preguntas: ${body.questionCount}`,
        `Tipos de pregunta: ${TYPE_LABELS[body.questionTypes] ?? body.questionTypes}`,
        `Dificultad: ${DIFFICULTY_LABELS[body.difficulty] ?? body.difficulty}`,
        `Puntaje total: ${body.totalPoints} puntos (reparte los puntos entre las preguntas de forma sensata)`,
        body.context.trim() ? `Contexto de lo visto en clase:\n${body.context.trim().slice(0, 3000)}` : "",
        "",
        `Devuelve un JSON con EXACTAMENTE estas llaves: ${keys}.`,
        "- title: título del examen, p. ej. 'Examen de Biología — Fotosíntesis'.",
        "- instructions: instrucciones breves para el estudiante (2-3 líneas).",
        "- questions: lista con number (1..N), type ('opcion_multiple' | 'verdadero_falso' | 'desarrollo'), question (enunciado claro), options (solo para opcion_multiple: exactamente 4), correctAnswer (la respuesta correcta: letra/texto exacto), explanation (por qué es correcta, 1-2 frases), points.",
        "- La suma de points debe ser igual al puntaje total.",
        "- correctAnswer y explanation forman la CLAVE del docente: deben ser correctas y precisas.",
      ]
        .filter(Boolean)
        .join("\n");

      const responsesUrl = "https://api.openai.com/v1/responses";
      const res = await fetchOpenAi("exam_generator", responsesUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: [
            { role: "system", content: [{ type: "input_text", text: system }] },
            { role: "user", content: [{ type: "input_text", text: userText }] },
          ],
          temperature: 0.4,
        }),
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
            { error: "Sin cuota OpenAI ahora (HTTP 429). Revisa facturación en OpenAI Platform e inténtalo de nuevo." },
            { status: 429 },
          );
        }
        return NextResponse.json({ error: `OpenAI error (HTTP ${res.status}): ${message || "Unknown"}` }, { status: 502 });
      }

      const payload = (await res.json()) as unknown;
      const text = extractResponsesOutputText(payload);
      const parsedJson = parseJsonFromModelText(text);
      const exam = generatedExamSchema.parse(parsedJson);

      return NextResponse.json({ exam });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
