import { NextResponse } from "next/server";
import { z } from "zod";

import { buildFallbackClassPresentation } from "@/lib/class-presentation/build-fallback-presentation";
import { fetchOpenAi, runOpenAiRoute } from "@/lib/observability/openai-sentry";
import { extractTextFromOpenAIResponses, parseJsonFromModelText } from "@/lib/openai/parse-json-response";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { classPresentationRateLimits } from "@/lib/rate-limit/openai-defaults";
import { consumeDailyUserQuota } from "@/lib/rate-limit/user-quota";
import { classPresentationSchema } from "@/lib/schemas/class-presentation";

export const runtime = "nodejs";
export const maxDuration = 60;

const pageHintSchema = z.object({
  pageNumber: z.number().int().min(1),
  filename: z.string().min(1),
  topic: z.string().optional(),
  documentId: z.string().optional(),
});

const requestSchema = z.object({
  subjectHint: z.string().default(""),
  extractedFileText: z.string().default(""),
  pageHints: z.array(pageHintSchema).default([]),
});

function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n\n...(recortado)`;
}

export async function POST(req: Request) {
  const ip = getClientIpKey(req);
  const limits = classPresentationRateLimits();
  const rl = tryConsumeRateToken(`class_presentation:${ip}`, limits.max, limits.windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const quota = await consumeDailyUserQuota(
    "class_presentation",
    parseInt(process.env.API_DAILY_LIMIT_CLASS_PRESENTATION ?? "50", 10),
  );
  if (!quota.ok) {
    return NextResponse.json(
      { error: quota.message },
      { status: quota.status, headers: quota.retryAfterSec ? { "Retry-After": String(quota.retryAfterSec) } : undefined },
    );
  }

  const body = requestSchema.parse(await req.json().catch(() => ({})));
  const subject = body.subjectHint.trim() || "Clase";
  const extracted = body.extractedFileText.trim();
  const pageHints = body.pageHints;

  const fallback = () =>
    buildFallbackClassPresentation(subject, extracted, pageHints);

  try {
    return await runOpenAiRoute("class_presentation", async () => {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

      if (!apiKey) {
        return NextResponse.json({
          presentation: fallback(),
          presentationError: "Sin OPENAI_API_KEY: usamos una clase visual básica.",
        });
      }

      const pageList =
        pageHints.length > 0
          ? pageHints
              .map(
                (p) =>
                  `- Hoja ${p.pageNumber}: ${p.filename}${p.topic ? ` (tema: ${p.topic})` : ""}${p.documentId ? ` [id:${p.documentId}]` : ""}`,
              )
              .join("\n")
          : "(sin metadatos de hojas)";

      const system = [
        "Eres un profesor que convierte apuntes en una mini-clase visual tipo pizarra digital.",
        "Responde SOLO con JSON válido, sin markdown ni texto extra.",
        "Todo en español. Explica con claridad, tono cercano y pedagógico.",
        "No inventes datos que no estén en los apuntes.",
      ].join(" ");

      const user = [
        `Materia: ${subject}`,
        "",
        "Hojas incluidas:",
        pageList,
        "",
        "Genera un objeto JSON con estas llaves EXACTAS:",
        "subjectLine, intro, outro, slides",
        "",
        "Reglas:",
        "- intro: 2 frases de bienvenida motivadoras.",
        "- outro: 1–2 frases de cierre y qué repasar.",
        "- slides: entre 6 y 10 diapositivas ordenadas pedagógicamente.",
        "- Cada slide: id, title, narration (2–3 frases cortas SOLO para voz, sin listas), bullets (2–4 puntos claros), highlightQuote (frase clave memorable), visualIcon, accent, diagram.",
        "- visualIcon: uno de lightbulb, book-open, chart-line, brain, calculator, layers, target, sparkles, flask-conical, globe, scale, code, atom.",
        "- accent: uno de violet, cyan, amber, rose, emerald (varía entre diapositivas).",
        "- diagram: { type: 'flow'|'compare'|'list'|'cycle'|'concept', items: [{ label, detail? }] } con 2–5 items. Usa 'concept' para idea central + ramas.",
        "- illustrationPrompt: descripción en inglés de un diagrama educativo ANOTADO: nombres de partes en español, flechas o líneas señalando cada zona, estilo infografía de libro de texto. Incluye 3–6 etiquetas concretas (ej. núcleo, membrana, mitocondria).",
        "- mermaidCode: diagrama Mermaid válido (flowchart TD, mindmap, timeline) que resuma la diapositiva; máx 12 nodos, etiquetas en español entre comillas.",
        "- Usa sourcePageNumber, sourceDocumentId y sourceFilename cuando encaje con una hoja.",
        "- narration: tono de profesor cercano, frases cortas, sin emojis.",
        "",
        "--- TEXTO DE LOS APUNTES ---",
        clip(extracted || "(poco texto extraído — sé breve y honesto)", 8000),
      ].join("\n");

      const res = await fetchOpenAi("class_presentation", "https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_output_tokens: 6200,
          input: [
            { role: "system", content: [{ type: "input_text", text: system }] },
            { role: "user", content: [{ type: "input_text", text: user }] },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return NextResponse.json({
          presentation: fallback(),
          presentationError: errText.slice(0, 200) || "La IA no respondió; usamos versión básica.",
        });
      }

      const payload = await res.json();
      const rawText = extractTextFromOpenAIResponses(payload);
      const parsed = parseJsonFromModelText<unknown>(rawText);
      const validated = parsed ? classPresentationSchema.safeParse(parsed) : null;

      if (!validated?.success) {
        return NextResponse.json({
          presentation: fallback(),
          presentationError: "No pudimos interpretar la respuesta de la IA; usamos versión básica.",
        });
      }

      return NextResponse.json({ presentation: validated.data, presentationError: null });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al generar la clase visual.";
    return NextResponse.json({
      presentation: fallback(),
      presentationError: msg,
    });
  }
}
