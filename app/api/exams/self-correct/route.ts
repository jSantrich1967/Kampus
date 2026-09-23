import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchOpenAi, runOpenAiRoute } from "@/lib/observability/openai-sentry";
import {
  selfCorrectionRequestSchema,
  selfCorrectionSchema,
} from "@/lib/schemas/self-exam-corrector";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { selfExamCorrectorRateLimits } from "@/lib/rate-limit/openai-defaults";
import { consumeDailyUserQuota } from "@/lib/rate-limit/user-quota";

export const runtime = "nodejs";

function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n\n...(recortado)`;
}

function isImageDataUrl(value: string): boolean {
  return /^data:image\/(png|jpe?g|webp|gif);base64,/.test(value);
}

function extractTextFromOpenAIResponses(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const root = payload as Record<string, unknown>;
  if (typeof root.output_text === "string" && root.output_text.trim()) return root.output_text.trim();

  const parts: string[] = [];
  collectText(payload, parts);
  return parts.map((p) => p.trim()).filter(Boolean).join("\n").trim();
}

function collectText(node: unknown, out: string[]): void {
  if (!node) return;
  if (typeof node === "string") {
    if (node.trim()) out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((n) => collectText(n, out));
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  if (typeof obj.type === "string" && typeof obj.text === "string" && obj.text.trim() && obj.type.endsWith("text")) {
    out.push(obj.text);
  }
  Object.values(obj).forEach((v) => collectText(v, out));
}

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
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") depth += 1;
    if (c === "}") {
      depth -= 1;
      if (depth === 0) return input.slice(start, i + 1);
    }
  }
  return null;
}

function stripMarkdownJsonFence(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  }
  return t;
}

function tryParseJsonObject(text: string): unknown {
  const cleaned = stripMarkdownJsonFence(text);
  if (!cleaned) return null;
  try {
    return JSON.parse(cleaned);
  } catch {
    const balanced = extractFirstBalancedJsonObject(cleaned);
    if (balanced) return JSON.parse(balanced);
    throw new Error("Invalid JSON response");
  }
}

export async function POST(req: Request) {
  const ip = getClientIpKey(req);
  const limits = selfExamCorrectorRateLimits();
  const rl = tryConsumeRateToken(`self_exam_correct:${ip}`, limits.max, limits.windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const quota = await consumeDailyUserQuota(
    "self_exam_corrector",
    parseInt(process.env.API_DAILY_LIMIT_SELF_CORRECT ?? "10", 10),
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
    return await runOpenAiRoute("self_exam_corrector", async () => {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

      if (!apiKey) {
        return NextResponse.json(
          { error: "La corrección con IA no está activada en este servidor (falta OPENAI_API_KEY)." },
          { status: 400 },
        );
      }

      let body: z.infer<typeof selfCorrectionRequestSchema>;
      try {
        body = selfCorrectionRequestSchema.parse(await req.json().catch(() => ({})));
      } catch {
        return NextResponse.json(
          { error: "Revisa los datos del formulario: necesitas al menos tus respuestas en texto o una foto de tu examen." },
          { status: 400 },
        );
      }

      const hasAnswers = body.studentAnswers.trim().length >= 3;
      const hasImage = body.studentImage.trim().length > 0 && isImageDataUrl(body.studentImage.trim());
      const hasKey = body.answerKey.trim().length >= 10;

      if (!hasAnswers && !hasImage) {
        return NextResponse.json(
          { error: "Pega tus respuestas en texto o sube una foto de tu examen para analizarlo." },
          { status: 400 },
        );
      }

      const keys = Object.keys(selfCorrectionSchema.shape).join(", ");

      const system = [
        "Eres un tutor que ayuda a un estudiante a aprender de sus errores.",
        "Hablas español cotidiano y sencillo, sin jerga académica.",
        "Tu objetivo es que el estudiante entienda qué salió mal y cómo mejorar, NO juzgarlo por la nota.",
        "Responde SOLO con un JSON válido (sin markdown, sin texto fuera del objeto). El último carácter debe ser `}`.",
        "No inventes respuestas del estudiante: si una pregunta no aparece o no se lee, explícalo en el análisis.",
      ].join(" ");

      const header = [
        `Materia: ${body.subject.trim() || "(sin materia)"}`,
        `Examen: ${body.examTitle.trim() || "(sin título)"}`,
        `Puntaje total del examen: ${body.totalPoints}`,
        "",
        hasKey
          ? "--- Clave oficial (compara las respuestas del estudiante contra esta clave) ---\n" + clip(body.answerKey, 10000)
          : "--- No hay clave oficial: evalúa por coherencia, conocimiento correcto de la materia y claridad; indícalo claramente en el análisis y no inventes una clave ---",
        "",
      ].join("\n");

      const userParts: Array<Record<string, unknown>> = [
        { type: "input_text", text: header },
      ];

      if (hasAnswers) {
        userParts.push({
          type: "input_text",
          text: `--- Respuestas del estudiante (texto) ---\n${clip(body.studentAnswers, 10000)}`,
        });
      }
      if (hasImage) {
        userParts.push({
          type: "input_text",
          text: "--- Foto del examen del estudiante (léela con cuidado, incluida la letra manuscrita) ---",
        });
        userParts.push({ type: "input_image", image_url: body.studentImage.trim(), detail: "high" });
      }

      userParts.push({
        type: "input_text",
        text: [
          `Devuelve un JSON con EXACTAMENTE estas llaves: ${keys}.`,
          "- percentage: número 0–100. Es una NOTA ESTIMADA, una aproximación para orientar; no es la nota oficial del docente.",
          `- estimatedLabel: frase corta, p. ej. '13/${body.totalPoints} aprox. — vas bien, con temas por reforzar'. Incluye la palabra 'aprox.' para dejar claro que es estimada.`,
          "- errorsByQuestion: una entrada por cada error que encuentres. question: la pregunta o ejercicio. whatWentWrong: qué salió mal en palabras sencillas. correctApproach: cómo era lo correcto, explicado paso a paso. topic: el tema de la materia al que pertenece el error.",
          "- weakTopics: entre 1 y 6 temas que el estudiante debe reforzar (nombres cortos).",
          "- recoveryPlan: acciones CONCRETAS de estudio para los próximos dos días. day1 y day2 son listas de acciones (p. ej. 'Repasa la fórmula del área con 5 ejercicios de la página 42').",
          "- flashcards: entre 6 y 10 tarjetas sobre los temas débiles. front: pregunta o término; back: respuesta corta y clara.",
          "- miniQuiz: entre 4 y 6 preguntas de autoevaluación sobre los temas débiles. Cada una con question, options (exactamente 4 opciones), correctIndex (0–3) y explanation (por qué es correcta).",
          "- encouragingComment: 2–3 frases que animen al estudiante, con tono cercano y sin presión por la nota.",
          "- El foco es QUÉ REFORZAR, no la nota. Sé específico y práctico en cada explicación.",
        ].join("\n"),
      });

      const responsesUrl = "https://api.openai.com/v1/responses";
      const res = await fetchOpenAi("self_exam_corrector", responsesUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: [
            { role: "system", content: [{ type: "input_text", text: system }] },
            { role: "user", content: userParts },
          ],
          temperature: 0.3,
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
      const text = extractTextFromOpenAIResponses(payload);
      const parsedJson = tryParseJsonObject(text);
      const correction = selfCorrectionSchema.parse(parsedJson);

      return NextResponse.json({ correction });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
