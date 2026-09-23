import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchOpenAi, runOpenAiRoute } from "@/lib/observability/openai-sentry";
import {
  examCorrectionRequestSchema,
  examCorrectionSchema,
} from "@/lib/schemas/exam-corrector";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { examCorrectorRateLimits } from "@/lib/rate-limit/openai-defaults";
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
  const limits = examCorrectorRateLimits();
  const rl = tryConsumeRateToken(`exam_corrector:${ip}`, limits.max, limits.windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const quota = await consumeDailyUserQuota(
    "exam_corrector",
    parseInt(process.env.API_DAILY_LIMIT_EXAM_CORRECTOR ?? "10", 10),
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
    return await runOpenAiRoute("exam_corrector", async () => {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

      if (!apiKey) {
        return NextResponse.json(
          { error: "La corrección con IA no está activada en este servidor (falta OPENAI_API_KEY)." },
          { status: 400 },
        );
      }

      let body: z.infer<typeof examCorrectionRequestSchema>;
      try {
        body = examCorrectionRequestSchema.parse(await req.json().catch(() => ({})));
      } catch {
        return NextResponse.json(
          { error: "Revisa los datos del formulario: nombre del estudiante, clave de respuestas y al menos las respuestas o una foto del examen." },
          { status: 400 },
        );
      }

      const hasAnswers = body.studentAnswers.trim().length >= 3;
      const hasImage = body.studentImage.trim().length > 0 && isImageDataUrl(body.studentImage.trim());

      if (!hasAnswers && !hasImage) {
        return NextResponse.json(
          { error: "Pega las respuestas del estudiante o sube una foto de su examen para corregirlo." },
          { status: 400 },
        );
      }

      const keys = Object.keys(examCorrectionSchema.shape).join(", ");

      const system = [
        "Eres un docente experto corrigiendo un EXAMEN en español.",
        "Compara las respuestas del estudiante contra la clave de respuestas del docente.",
        "Responde SOLO con un JSON válido (sin markdown, sin texto fuera del objeto). El último carácter debe ser `}`.",
        "No inventes respuestas del estudiante: si una pregunta no aparece o no se lee, márcala con 0 puntos y explícalo en el comentario.",
        "Sé justo y específico: cada comentario debe decir QUÉ esperaba la clave y QUÉ puso el estudiante.",
      ].join(" ");

      const header = [
        `Materia: ${body.subject.trim() || "(sin materia)"}`,
        `Examen: ${body.examTitle.trim() || "(sin título)"}`,
        `Estudiante: ${body.studentName.trim()}`,
        `Puntaje total del examen: ${body.totalPoints}`,
        "",
        "--- Clave de respuestas del docente ---",
        clip(body.answerKey, 10000),
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
          "- studentName: nombre del estudiante.",
          "- totalEarned: suma de puntos obtenidos (número, puede tener decimales).",
          "- totalPossible: puntaje total del examen.",
          "- percentage: 0–100.",
          `- label: frase corta con la nota, p. ej. '${body.totalPoints}/... — ' en formato 'X/${body.totalPoints} — resumen de una frase'.`,
          "- items: una entrada por pregunta de la clave, con question, expected (lo que pedía la clave), studentAnswer (lo que puso el estudiante), maxPoints, points, correct (true/false) y comment (una frase explicando la corrección).",
          "- maxPoints: si la clave NO indica los puntos de cada pregunta, reparte el puntaje total del examen entre las preguntas de forma proporcional (por defecto en partes iguales). La suma de maxPoints de TODOS los items debe ser EXACTAMENTE igual al puntaje total del examen. points nunca puede ser mayor que maxPoints.",
          "- totalEarned: suma de los points de todos los items (no inventes otro número).",
          "- strengths: 2–6 bullets de lo que hizo bien.",
          "- toImprove: 2–6 bullets de qué debe reforzar.",
          "- generalComment: 2–3 frases de cierre para el docente, con tono constructivo.",
        ].join("\n"),
      });

      const responsesUrl = "https://api.openai.com/v1/responses";
      const res = await fetchOpenAi("exam_corrector", responsesUrl, {
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
          temperature: 0.2,
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
      const correction = examCorrectionSchema.parse(parsedJson);

      return NextResponse.json({ correction });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
