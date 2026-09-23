import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchOpenAi, runOpenAiRoute } from "@/lib/observability/openai-sentry";
import {
  materialConversionRequestSchema,
  materialConversionSchema,
} from "@/lib/schemas/material-converter";
import {
  getClientIpKey,
  tryConsumeRateToken,
} from "@/lib/rate-limit/ip-bucket";
import { materialConverterRateLimits } from "@/lib/rate-limit/openai-defaults";
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
  if (
    typeof root.output_text === "string" &&
    root.output_text.trim()
  )
    return root.output_text.trim();

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
  if (
    typeof obj.type === "string" &&
    typeof obj.text === "string" &&
    obj.text.trim() &&
    obj.type.endsWith("text")
  ) {
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
  const limits = materialConverterRateLimits();
  const rl = tryConsumeRateToken(`material_convert:${ip}`, limits.max, limits.windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const quota = await consumeDailyUserQuota(
    "material_convert",
    parseInt(process.env.API_DAILY_LIMIT_MATERIAL_CONVERT ?? "10", 10),
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
    return await runOpenAiRoute("material_convert", async () => {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

      if (!apiKey) {
        return NextResponse.json(
          { error: "La conversión con IA no está activada en este servidor (falta OPENAI_API_KEY)." },
          { status: 400 },
        );
      }

      let body: z.infer<typeof materialConversionRequestSchema>;
      try {
        body = materialConversionRequestSchema.parse(
          await req.json().catch(() => ({})),
        );
      } catch {
        return NextResponse.json(
          { error: "Revisa los datos del formulario: la materia y el material (texto, PDF o foto)." },
          { status: 400 },
        );
      }

      const hasText = body.materialText.trim().length >= 20;
      const hasImage =
        body.materialImage.trim().length > 0 &&
        isImageDataUrl(body.materialImage.trim());

      if (!hasText && !hasImage) {
        return NextResponse.json(
          {
            error:
              "Sube un PDF o una foto de tu material, o pega el texto directamente.",
          },
          { status: 400 },
        );
      }

      const keys = Object.keys(materialConversionSchema.shape).join(", ");

      const system = [
        "Eres un tutor que convierte material de estudio en un cuaderno claro.",
        "Escribe en español sencillo y directo, sin jerga técnica, pensado para un estudiante.",
        "Responde SOLO con un JSON válido (sin markdown, sin texto fuera del objeto). El último carácter debe ser `}`.",
        "No inventes contenido: resume y organiza únicamente lo que aparece en el material. Si el material es muy corto, trabaja con lo que haya sin rellenar.",
      ].join(" ");

      const userParts: Array<Record<string, unknown>> = [];

      if (hasText) {
        userParts.push({
          type: "input_text",
          text: `--- Material de estudio (texto) ---\n${clip(body.materialText, 12000)}`,
        });
      }
      if (hasImage) {
        userParts.push({
          type: "input_text",
          text: "--- Foto del material de estudio (léela con cuidado, incluida la letra manuscrita) ---",
        });
        userParts.push({
          type: "input_image",
          image_url: body.materialImage.trim(),
          detail: "high",
        });
      }

      userParts.push({
        type: "input_text",
        text: [
          `Materia: ${body.subject.trim()}`,
          body.title?.trim() ? `Título sugerido: ${body.title.trim()}` : null,
          "",
          `Devuelve un JSON con EXACTAMENTE estas llaves: ${keys}.`,
          "- title: título corto y claro para el cuaderno (máx. 160 caracteres).",
          "- summary: resumen del material en 3-5 frases, con lo más importante.",
          "- keyPoints: entre 4 y 10 ideas clave, cada una en una frase corta.",
          "- flashcards: entre 6 y 15 tarjetas de estudio con front (pregunta o concepto) y back (respuesta breve).",
          "- quiz: entre 4 y 8 preguntas de opción múltiple con question, options (4 textos), correctIndex (0-3) y explanation (1-2 frases de por qué esa es la respuesta correcta).",
          "- correctIndex debe ser el índice dentro de options que contiene la respuesta correcta.",
        ]
          .filter(Boolean)
          .join("\n"),
      });

      const responsesUrl = "https://api.openai.com/v1/responses";
      const res = await fetchOpenAi("material_convert", responsesUrl, {
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
        return NextResponse.json(
          { error: `OpenAI error (HTTP ${res.status}): ${message || "Unknown"}` },
          { status: 502 },
        );
      }

      const payload = (await res.json()) as unknown;
      const text = extractTextFromOpenAIResponses(payload);
      const parsedJson = tryParseJsonObject(text);
      const conversion = materialConversionSchema.parse(parsedJson);

      return NextResponse.json({ conversion });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
