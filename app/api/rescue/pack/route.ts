import { NextResponse } from "next/server";
import { z } from "zod";

import { rescuePackSchema } from "@/lib/schemas/rescue-pack";

export const runtime = "nodejs";

const requestSchema = z.object({
  seedText: z.string().default(""),
  subjectHint: z.string().default(""),
  sourceLabel: z.string().default(""),
  sourceKind: z.string().optional(),
});

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

function tryParseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // Sometimes the model wraps JSON in extra text. Try the biggest {...} block.
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const candidate = trimmed.slice(start, end + 1);
      return JSON.parse(candidate);
    }
    throw new Error("Invalid JSON response");
  }
}

export async function POST(req: Request) {
  try {
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

    // Keep token usage predictable: we only send a limited excerpt.
    const seed = (body.seedText || "").trim();
    const excerpt = seed.length > 9000 ? `${seed.slice(0, 9000)}\n\n...(recortado)` : seed;

    const system = [
      "Eres un tutor experto. Tu trabajo es convertir apuntes crudos en un kit de estudio accionable.",
      "Responde SOLO con un JSON válido, sin markdown, sin texto extra.",
      "Todo el contenido debe estar en español (puedes conservar símbolos, fórmulas o términos técnicos).",
      "No inventes datos específicos (fechas, autores, resultados) si no aparecen en la fuente; si falta, dilo de forma general.",
    ].join(" ");

    const user = [
      `Materia foco: ${subject}`,
      `Fuente: ${sourceLabel}${body.sourceKind ? ` (${body.sourceKind})` : ""}`,
      "",
      "Usa el texto de la fuente para producir un objeto con EXACTAMENTE estas llaves:",
      Object.keys(rescuePackSchema.shape).join(", "),
      "",
      "Reglas importantes:",
      "- keyIdeas: 6–10 bullets cortos.",
      "- probableExamQuestions: 6–10 preguntas tipo examen (enunciado).",
      "- flashcards: 8–12 tarjetas (front/back).",
      "- quiz: 6–10 preguntas de opción múltiple con 4 opciones y answerIndex correcto (0-3).",
      "- studyChecklist: 6–10 pasos concretos (con tiempos si aplica).",
      "- mindMapOutline: un outline tipo mapa mental (texto con indentación).",
      "- questionsForClass: 5–8 preguntas para aclarar dudas con el profe/mentor.",
      "",
      "Texto de la fuente (puede estar incompleto):",
      excerpt || "(sin texto)",
    ].join("\n");

    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: [{ type: "input_text", text: system }] },
          { role: "user", content: [{ type: "input_text", text: user }] },
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
          {
            error:
              "Generación no disponible ahora: tu cuenta de OpenAI se quedó sin cuota/saldo (HTTP 429). " +
              "Revisa OpenAI Platform → Billing/Usage y reintenta.",
          },
          { status: 429 },
        );
      }
      return NextResponse.json({ error: `OpenAI error (HTTP ${res.status}): ${message || "Unknown error"}` }, { status: 502 });
    }

    const payload = (await res.json()) as unknown;
    const text = extractTextFromOpenAIResponses(payload);
    const parsedJson = tryParseJsonObject(text);
    const pack = rescuePackSchema.parse(parsedJson);

    return NextResponse.json({ pack });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
