import { NextResponse } from "next/server";
import { z } from "zod";

import { planLimitMessage } from "@/lib/ai/ai-budget";
import { fetchOpenAi, runOpenAiRoute } from "@/lib/observability/openai-sentry";
import { extractResponsesOutputText } from "@/lib/openai/extract-responses-output-text";
import { parseJsonFromModelText } from "@/lib/openai/parse-json-response";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { autoGraderRateLimits } from "@/lib/rate-limit/openai-defaults";
import { consumeDailyUserQuota } from "@/lib/rate-limit/user-quota";
import {
  autoGraderRequestSchema,
  autoGraderResultSchema,
} from "@/lib/schemas/auto-grader";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function callerMayGrade(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.rpc("may_generate_teaching_exam");
  return !error && data === true;
}

export async function POST(req: Request) {
  const ip = getClientIpKey(req);
  const limits = autoGraderRateLimits();
  const rl = tryConsumeRateToken(`auto_grader:${ip}`, limits.max, limits.windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const quota = await consumeDailyUserQuota(
    "auto_grader",
    parseInt(process.env.API_DAILY_LIMIT_AUTO_GRADER ?? "30", 10),
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

  const allowed = await callerMayGrade();
  if (!allowed) {
    return NextResponse.json(
      { error: "Esta cuenta no tiene permiso para corregir exámenes." },
      { status: 403 },
    );
  }

  try {
    return await runOpenAiRoute("auto_grader", async () => {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

      if (!apiKey) {
        return NextResponse.json(
          { error: "La corrección con IA no está activada en este servidor (falta OPENAI_API_KEY)." },
          { status: 400 },
        );
      }

      let body: z.infer<typeof autoGraderRequestSchema>;
      try {
        body = autoGraderRequestSchema.parse(await req.json().catch(() => ({})));
      } catch {
        return NextResponse.json(
          { error: "Revisa el formulario: materia, estudiante y al menos una pregunta son obligatorios." },
          { status: 400 },
        );
      }

      const hasImage = body.answerImage.length > 0;
      const answers = body.questions.map((_, i) => (body.answers[i] ?? "").trim());
      if (!hasImage && answers.every((a) => a.length === 0)) {
        return NextResponse.json(
          { error: "Escribe las respuestas del estudiante o sube la foto de su examen." },
          { status: 400 },
        );
      }

      const keys = Object.keys(autoGraderResultSchema.shape).join(", ");

      const system = [
        "Eres un docente experto corrigiendo un examen con justicia y criterio pedagógico.",
        "Calificas cada pregunta comparando la respuesta del estudiante con la clave y los criterios del docente.",
        "Das crédito parcial cuando la respuesta muestra comprensión aunque esté incompleta.",
        "El puntaje de cada pregunta va de 0 a su puntaje máximo, con máximo un decimal.",
        "Tu feedback es breve, concreto y útil para que el estudiante mejore (máx 2 frases por pregunta).",
        "Responde SOLO con un JSON válido (sin markdown, sin texto fuera del objeto). El último carácter debe ser `}`.",
      ].join(" ");

      const rubricText = body.questions
        .map(
          (q, i) =>
            `Pregunta ${i + 1} (${q.maxPoints} pts): ${q.question}\nClave/criterios: ${q.answerKey || "(no indicada; usa tu criterio docente)"}\nRespuesta del estudiante: ${answers[i] || "(sin respuesta)"}`,
        )
        .join("\n\n");

      const userParts: Array<Record<string, unknown>> = [];
      if (hasImage) {
        userParts.push({
          type: "input_text",
          text: "--- Foto del examen respondido por el estudiante (léela con cuidado, incluida letra manuscrita; úsala como fuente de las respuestas) ---",
        });
        userParts.push({ type: "input_image", image_url: body.answerImage, detail: "high" });
      }
      userParts.push({
        type: "input_text",
        text: [
          `Materia: ${body.subject}`,
          body.examTitle.trim() ? `Examen: ${body.examTitle.trim()}` : "",
          `Estudiante: ${body.studentName}`,
          "",
          "--- Rúbrica y respuestas ---",
          rubricText,
          "",
          `Devuelve un JSON con EXACTAMENTE estas llaves: ${keys}.`,
          "- perQuestion: lista en el MISMO orden de las preguntas, cada una con score (0 a su máximo) y feedback (1-2 frases).",
          "- totalScore: suma de los puntajes, con máximo un decimal.",
          "- overallFeedback: comentario general breve para el estudiante (2-3 frases): qué dominó y qué debe reforzar.",
        ]
          .filter(Boolean)
          .join("\n"),
      });

      const responsesUrl = "https://api.openai.com/v1/responses";
      const res = await fetchOpenAi("auto_grader", responsesUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: [
            { role: "system", content: [{ type: "input_text", text: system }] },
            { role: "user", content: userParts },
          ],
          temperature: 0.2,
          max_output_tokens: 2500,
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("auto_grader openai error", res.status, detail.slice(0, 500));
        return NextResponse.json(
          { error: "No se pudo corregir con IA en este momento. Inténtalo de nuevo." },
          { status: 502 },
        );
      }

      const raw = extractResponsesOutputText(await res.json().catch(() => null));
      const parsed = parseJsonFromModelText(raw);
      const result = autoGraderResultSchema.safeParse(parsed);
      if (!result.success || result.data.perQuestion.length !== body.questions.length) {
        return NextResponse.json(
          { error: "La IA devolvió un resultado inválido. Inténtalo de nuevo." },
          { status: 502 },
        );
      }

      // Clamp scores to each question's max (the model sometimes overshoots).
      const perQuestion = result.data.perQuestion.map((q, i) => ({
        score: Math.max(0, Math.min(body.questions[i].maxPoints, Math.round(q.score * 10) / 10)),
        feedback: q.feedback,
      }));
      const totalScore = Math.round(perQuestion.reduce((s, q) => s + q.score, 0) * 10) / 10;

      return NextResponse.json({
        result: { ...result.data, perQuestion, totalScore },
        planLimit: await planLimitMessage(res),
      });
    });
  } catch (e) {
    console.error("auto_grader unexpected", e);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado al corregir." },
      { status: 500 },
    );
  }
}
