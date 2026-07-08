import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchOpenAi, runOpenAiRoute } from "@/lib/observability/openai-sentry";
import { rescuePackSchema } from "@/lib/schemas/rescue-pack";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { rescuePackRateLimits } from "@/lib/rate-limit/openai-defaults";
import { consumeDailyUserQuota } from "@/lib/rate-limit/user-quota";

export const runtime = "nodejs";
/** Vercel Pro: up to 60s. Required for OpenAI kit generation in production. */
export const maxDuration = 60;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const requestSchema = z.object({
  subjectHint: z.string().default(""),
  sourceLabel: z.string().default(""),
  sourceKind: z.string().optional(),
  packMode: z.enum(["lite", "full"]).optional(),
  /** OCR / PDF / TXT — primary grounding for uploaded files */
  extractedFileText: z.string().default(""),
  notes: z.string().default(""),
  link: z.string().default(""),
  uploadedFileCount: z.number().int().min(0).default(0),
  /** Legacy: combined blob if older clients omit structured fields */
  seedText: z.string().default(""),
});

const MIN_EXTRACT_CHARS = 25;

function looksLikeNoUsefulExtract(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  const lower = t.toLowerCase();
  if (lower.includes("sin texto") || lower.includes("no text") || lower.includes("missing openai")) return true;
  if (/\b(resp|msg)_[a-z0-9_\-]{8,}\b/i.test(t)) return true;
  if (t.replace(/\s+/g, "").length < MIN_EXTRACT_CHARS) return true;
  return false;
}

function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n\n...(recortado)`;
}

function extractTextFromOpenAIResponses(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const root = payload as Record<string, unknown>;
  if (typeof root.output_text === "string" && root.output_text.trim()) return root.output_text.trim();

  const parts: string[] = [];
  collectOpenAIResponseText(payload, parts);
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function collectOpenAIResponseText(node: unknown, out: string[]): void {
  if (!node) return;
  if (typeof node === "string") {
    if (node.trim()) out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((n) => collectOpenAIResponseText(n, out));
    return;
  }
  if (typeof node !== "object") return;

  const obj = node as Record<string, unknown>;
  const type = obj.type;
  const text = obj.text;
  if (typeof type === "string" && typeof text === "string" && text.trim()) {
    if (type.endsWith("text")) out.push(text);
  }
  Object.values(obj).forEach((v) => collectOpenAIResponseText(v, out));
}

/**
 * OpenAI sometimes returns a valid JSON object followed by extra prose (or multiple chunks get concatenated).
 * `JSON.parse` then fails with: "Unexpected non-whitespace character after JSON at position …".
 * We extract the first balanced `{ ... }` while respecting string literals.
 */
function extractFirstBalancedJsonObject(input: string): string | null {
  const start = input.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < input.length; i += 1) {
    const c = input[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === "\\") {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }

    if (c === '"') {
      inString = true;
      continue;
    }

    if (c === "{") depth += 1;
    if (c === "}") {
      depth -= 1;
      if (depth === 0) {
        return input.slice(start, i + 1);
      }
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
    if (balanced) {
      return JSON.parse(balanced);
    }
    throw new Error("Invalid JSON response");
  }
}

export async function POST(req: Request) {
  const ip = getClientIpKey(req);
  const limits = rescuePackRateLimits();
  const rl = tryConsumeRateToken(`rescue_pack:${ip}`, limits.max, limits.windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const quota = await consumeDailyUserQuota(
    "rescue_pack",
    parseInt(process.env.API_DAILY_LIMIT_RESCUE_PACK ?? "20", 10),
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
    return await runOpenAiRoute("rescue_pack", async () => {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

      if (!apiKey) {
        return NextResponse.json(
          { error: "Falta OPENAI_API_KEY en el servidor. Agrega la variable en Vercel para generar el kit con IA." },
          { status: 400 },
        );
      }

      const body = requestSchema.parse(await req.json().catch(() => ({})));
    const subject = body.subjectHint.trim() || "la materia";
    const sourceLabel = body.sourceLabel.trim() || "material";

    const extracted = (body.extractedFileText || "").trim();
    const notes = (body.notes || "").trim();
    const link = (body.link || "").trim();
    const legacySeed = (body.seedText || "").trim();
    const hasUploadedFiles = body.uploadedFileCount > 0;
    const extractUseful = !looksLikeNoUsefulExtract(extracted);
    const hasNotes = notes.length > 0;
    const hasLink = link.length > 0;
    const packMode = body.packMode === "lite" ? "lite" : "full";

    let groundingMode = "";
    if (hasUploadedFiles && extractUseful) {
      groundingMode = [
        "MODO DE ANCLAJE (obligatorio): Hay CONTENIDO EXTRAÍDO DEL ARCHIVO con texto sustancial.",
        "Todo el kit (resúmenes, ideas clave, preguntas, quiz, tarjetas, checklist, mapa) debe derivarse PRINCIPALMENTE de ese bloque.",
        `La “Materia foco” (${subject}) es solo etiqueta: NO añadas temario genérico de esa materia si NO aparece en el texto extraído.`,
        "Si necesitas nombrar la materia, hazlo al inicio del subjectLine o en 1 frase, pero el contenido debe reflejar el archivo.",
        "Prohibido inventar modelos, técnicas o listas típicas de examen que no estén en el texto (p. ej. Tobit/Probit) salvo que el texto las mencione.",
      ].join(" ");
    } else if (hasUploadedFiles && !extractUseful) {
      groundingMode = [
        "MODO DE ANCLAJE (obligatorio): Subieron archivo(s), pero el texto extraído está vacío o no es útil.",
        "NO generes un temario amplio ni “clase magistral” genérico de la materia para rellenar.",
        "Genera un kit CORTO y honesto: explica que falta texto extraíble, sugiere foto más nítida/PDF/texto, y da pasos prácticos para recuperar la clase.",
        "keyIdeas / preguntas / quiz deben enfocarse en cómo mejorar la fuente y qué hacer ahora (no contenido académico inventado).",
      ].join(" ");
    } else if (hasNotes) {
      groundingMode =
        "MODO DE ANCLAJE: No hay archivo con texto extraído; basa el kit en NOTAS PEGADAS. No inventes párrafos que contradigan esas notas.";
    } else if (hasLink) {
      groundingMode =
        "MODO DE ANCLAJE: Solo hay un enlace (no tenemos el contenido web descargado). Sé prudente: no inventes detalles del enlace; pide pegar extractos o subir archivo.";
    } else if (legacySeed) {
      groundingMode =
        "MODO DE ANCLAJE: Solo hay metadatos / texto mínimo. No rellenes con temario largo; mantén el kit breve y orientado a qué falta para poder estudiar.";
    } else {
      groundingMode =
        "MODO DE ANCLAJE: Casi no hay fuente. Kit mínimo: qué información falta y cómo obtenerla.";
    }

    const system = [
      "Eres un tutor experto. Tu trabajo es convertir apuntes crudos en un kit de estudio accionable.",
      "Responde SOLO con un JSON válido, sin markdown, sin texto extra.",
      "El último carácter de tu respuesta debe ser `}` (cierra el objeto JSON). No escribas nada después.",
      "Todo el contenido debe estar en español (puedes conservar símbolos, fórmulas o términos técnicos).",
      "No inventes datos específicos (fechas, autores, resultados) si no aparecen en la fuente; si falta, dilo de forma general.",
    ].join(" ");

    const user = [
      groundingMode,
      "",
      `Materia foco (etiqueta): ${subject}`,
      `Archivos subidos: ${hasUploadedFiles ? "sí" : "no"}${hasUploadedFiles ? ` (${body.uploadedFileCount})` : ""}`,
      `Fuente: ${sourceLabel}${body.sourceKind ? ` (${body.sourceKind})` : ""}`,
      `Modo de pack: ${packMode === "lite" ? "lite (rápido)" : "full"}`,
      "",
      "Produce un objeto JSON con EXACTAMENTE estas llaves:",
      Object.keys(rescuePackSchema.shape).join(", "),
      "",
      "Reglas importantes:",
      ...(packMode === "lite"
        ? [
            "- keyIdeas: 4–6 bullets cortos.",
            "- probableExamQuestions: 4–6 preguntas tipo examen (enunciado).",
            "- flashcards: 4–6 tarjetas (front/back).",
            "- quiz: 3–5 preguntas de opción múltiple con 4 opciones y answerIndex correcto (0-3).",
            "- studyChecklist: 4–6 pasos concretos.",
            "- fullSummary/deepExplanation/easyExplanation/technicalExplanation: cortos (1–3 párrafos).",
          ]
        : [
            "- keyIdeas: 6–10 bullets cortos.",
            "- probableExamQuestions: 6–10 preguntas tipo examen (enunciado).",
            "- flashcards: 8–12 tarjetas (front/back).",
            "- quiz: 6–10 preguntas de opción múltiple con 4 opciones y answerIndex correcto (0-3).",
            "- studyChecklist: 6–10 pasos concretos (con tiempos si aplica).",
          ]),
      "- mindMapOutline: un outline tipo mapa mental (texto con indentación).",
      "- questionsForClass: 5–8 preguntas para aclarar dudas con el profe/mentor.",
      "- subjectLine: debe reflejar el TEMA del material (del texto extraído o notas), no solo el nombre genérico de la materia.",
      "",
      "--- CONTENIDO EXTRAÍDO DEL ARCHIVO (prioridad si hay texto útil) ---",
      clip(extracted || "(vacío)", packMode === "lite" ? 5500 : 9000),
      "",
      "--- NOTAS PEGADAS ---",
      clip(notes || "(vacío)", packMode === "lite" ? 2500 : 4000),
      "",
      "--- ENLACE ---",
      link || "(vacío)",
      "",
      ...(legacySeed && !extracted && !notes && !link
        ? ["--- METADATOS / LEGACY ---", clip(legacySeed, 2000)]
        : []),
    ].join("\n");

    const openaiUrl = "https://api.openai.com/v1/responses";
    const openaiPayload = {
      model,
      input: [
        { role: "system", content: [{ type: "input_text", text: system }] },
        { role: "user", content: [{ type: "input_text", text: user }] },
      ],
      temperature: extractUseful ? 0.25 : 0.35,
      max_output_tokens: packMode === "lite" ? 1400 : 2600,
    };

    // Retries for transient OpenAI issues (e.g., HTTP 500/503).
    const transientStatuses = new Set([500, 502, 503, 504]);
    let lastRes: Response | null = null;
    let attempts = 0;
    const maxAttempts = 3;
    const backoffMs = [350, 900, 1800];

    while (attempts < maxAttempts) {
      attempts += 1;
      lastRes = await fetchOpenAi("rescue_pack", openaiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(openaiPayload),
      });
      if (lastRes.ok) break;
      if (!transientStatuses.has(lastRes.status)) break;
      await sleep(backoffMs[Math.min(attempts - 1, backoffMs.length - 1)] ?? 900);
    }

    const res = lastRes!;

    if (!res.ok) {
      let message = "";
      const requestId = res.headers.get("x-request-id") || res.headers.get("x-openai-request-id") || "";
      try {
        const json = (await res.json()) as { error?: { message?: string } };
        message = json.error?.message ?? "";
      } catch {
        message = (await res.text()).slice(0, 400);
      }
      if (res.status === 429) {
        return NextResponse.json(
          {
            error:
              "Generación no disponible ahora: tu cuenta de OpenAI se quedó sin cuota/saldo (HTTP 429). " +
              "Revisa OpenAI Platform → Billing/Usage y reintenta.",
          },
          { status: 429 },
        );
      }
      const retryNote = attempts > 1 ? ` (reintentamos ${attempts} veces)` : "";
      const idNote = requestId ? ` · request_id: ${requestId}` : "";
      return NextResponse.json(
        { error: `OpenAI error (HTTP ${res.status})${retryNote}: ${message || "Unknown error"}${idNote}` },
        { status: 502 },
      );
    }

    const payload = (await res.json()) as unknown;
    const text = extractTextFromOpenAIResponses(payload);
    const parsedJson = tryParseJsonObject(text);
    const pack = rescuePackSchema.parse(parsedJson);

    return NextResponse.json({ pack });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
