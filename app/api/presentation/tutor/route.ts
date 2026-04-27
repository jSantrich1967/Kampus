import { NextResponse } from "next/server";
import { z } from "zod";

import { presentationTutorFeedbackSchema } from "@/lib/schemas/presentation-tutor";

export const runtime = "nodejs";

const requestSchema = z.object({
  deckTitle: z.string().max(200).default(""),
  rehearsalNotes: z.string().max(12000).default(""),
  masterScript: z.string().max(8000).default(""),
  sectionsSummary: z.string().max(12000).default(""),
  juryNotes: z.string().max(4000).default(""),
  probableQuestions: z.array(z.string()).max(40).default([]),
});

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
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

    if (!apiKey) {
      return NextResponse.json(
        { error: "Falta OPENAI_API_KEY en el servidor para usar el tutor calificador." },
        { status: 400 },
      );
    }

    const body = requestSchema.parse(await req.json().catch(() => ({})));
    const hasContent =
      body.rehearsalNotes.trim().length > 20 ||
      body.masterScript.trim().length > 20 ||
      body.sectionsSummary.trim().length > 20;

    if (!hasContent) {
      return NextResponse.json(
        { error: "Añade notas del ensayo, transcripción o resumen de guiones antes de pedir calificación." },
        { status: 400 },
      );
    }

    const system = [
      "Eres un tutor académico amable y exigente que califica ENSAYOS DE EXPOSICIÓN en español.",
      "Responde SOLO con un JSON válido (sin markdown, sin texto fuera del objeto).",
      "Último carácter debe ser `}`.",
      "No inventes hechos que no aparezcan en el material del alumno; si falta contexto, dilo en tips generales de presentación oral.",
      "Sé concreto: referencia ritmo, claridad, estructura, manejo del tiempo y respuesta a preguntas si hay datos.",
    ].join(" ");

    const keys = Object.keys(presentationTutorFeedbackSchema.shape).join(", ");

    const user = [
      `Título / deck: ${body.deckTitle.trim() || "(sin título)"}`,
      "",
      "--- Notas o transcripción del ensayo (prioridad) ---",
      clip(body.rehearsalNotes, 10000),
      "",
      "--- Resumen de secciones (títulos + guiones cortos) ---",
      clip(body.sectionsSummary, 8000),
      "",
      "--- Guión maestro ---",
      clip(body.masterScript, 4000),
      "",
      "--- Preguntas probables del jurado ---",
      body.probableQuestions.length ? body.probableQuestions.map((q) => `- ${q}`).join("\n") : "(vacío)",
      "",
      "--- Notas del jurado simulado ---",
      clip(body.juryNotes, 2000),
      "",
      `Devuelve un JSON con EXACTAMENTE estas llaves: ${keys}.`,
      "- overallScoreLabel: una frase corta (puede incluir algo tipo 7/10 si tiene sentido).",
      "- strengths: 3–6 bullets de lo bien hecho.",
      "- toImprove: 3–6 bullets de qué falló o está débil.",
      "- concreteTips: 4–8 acciones concretas para la siguiente corrida.",
      "- closingEncouragement: 1–2 frases de ánimo realista.",
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
        temperature: 0.35,
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
              "Sin cuota OpenAI ahora (HTTP 429). Revisa facturación en OpenAI Platform e inténtalo de nuevo.",
          },
          { status: 429 },
        );
      }
      return NextResponse.json({ error: `OpenAI error (HTTP ${res.status}): ${message || "Unknown"}` }, { status: 502 });
    }

    const payload = (await res.json()) as unknown;
    const text = extractTextFromOpenAIResponses(payload);
    const parsedJson = tryParseJsonObject(text);
    const feedback = presentationTutorFeedbackSchema.parse(parsedJson);

    return NextResponse.json({ feedback });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
