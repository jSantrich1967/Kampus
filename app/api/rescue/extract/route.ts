import { NextResponse } from "next/server";

import { fetchOpenAi, runOpenAiRoute } from "@/lib/observability/openai-sentry";
import { stripOpenAiResponseLeakage } from "@/lib/notebooks/openai-extract-cleanup";
import { repairSpuriousAmpersandOcrText } from "@/lib/notebooks/ocr-text-repair";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { rescueExtractRateLimits } from "@/lib/rate-limit/openai-defaults";
import { consumeDailyUserQuota } from "@/lib/rate-limit/user-quota";

export const runtime = "nodejs";

async function preprocessImageForOcrDataUrl(file: File): Promise<string> {
  const inputMime = file.type || "image/png";
  const buf = Buffer.from(await file.arrayBuffer());

  // If sharp isn't available (should be in Node runtime), fall back to the original image.
  try {
    type SharpChain = {
      rotate: () => SharpChain;
      resize: (opts: unknown) => SharpChain;
      grayscale: () => SharpChain;
      normalize: () => SharpChain;
      sharpen: () => SharpChain;
      png: (opts: unknown) => SharpChain;
      toBuffer: () => Promise<Buffer>;
    };

    type SharpLike = (input: Buffer, options?: unknown) => SharpChain;

    const mod = (await import("sharp")) as unknown as { default: SharpLike };
    const sharp = mod.default;

    // Goals:
    // - normalize orientation (photos)
    // - increase contrast slightly
    // - upscale small scans a bit, downscale huge images
    // - mild sharpening to help small text
    const processed = await sharp(buf, { failOn: "none" })
      .rotate()
      .resize({
        width: 2000,
        withoutEnlargement: false,
        fit: "inside",
      })
      .grayscale()
      .normalize()
      .sharpen()
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();

    const base64 = processed.toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch {
    const base64 = buf.toString("base64");
    return `data:${inputMime};base64,${base64}`;
  }
}

type ExtractedFile = {
  name: string;
  type: string;
  size: number;
  text: string;
};

function isImage(mime: string, name: string): boolean {
  if (mime.startsWith("image/")) return true;
  const lower = name.toLowerCase();
  return lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp");
}

function isTextLike(mime: string, name: string): boolean {
  if (mime.startsWith("text/")) return true;
  const lower = name.toLowerCase();
  return lower.endsWith(".md") || lower.endsWith(".txt") || lower.endsWith(".csv");
}

function isPdf(mime: string, name: string): boolean {
  if (mime === "application/pdf") return true;
  return name.toLowerCase().endsWith(".pdf");
}

async function ocrImageWithOpenAI(file: File): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4.1";
  if (!apiKey) {
    return "[Missing OPENAI_API_KEY on the server. Add it in Vercel env vars to enable OCR for images.]";
  }

  const dataUrl = await preprocessImageForOcrDataUrl(file);

  const res = await fetchOpenAi("rescue_extract.ocr", "https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_output_tokens: 8192,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Eres un motor OCR de alta precisión. Transcribe TODO el texto visible en la imagen.\n\n" +
                "SALIDA:\n" +
                "- Devuelve SOLO la transcripción. Sin explicaciones, sin JSON, sin etiquetas, sin metadatos ni IDs.\n" +
                "- Prosa y listas: español normal con tildes y puntuación correctas.\n" +
                "- Ecuaciones y fórmulas matemáticas: usa LaTeX entre $...$ (en línea) o $$...$$ (bloque).\n" +
                "  Ejemplos: $E(y_t)=\\mu$, $\\operatorname{Var}(y_t)=\\sigma^2$, " +
                "$\\operatorname{Cov}(y_t,y_{t+k})=\\gamma_k$, $\\Delta y_t = y_t - y_{t-1}$, " +
                "$y_t = y_{t-1} + \\varepsilon_t$.\n" +
                "- PROHIBIDO colocar el carácter & entre letras o símbolos para separar caracteres " +
                "(nada como &E&(&y&t&) ni &-& al inicio de línea).\n" +
                "- PROHIBIDO deletrear fórmulas con &; escribe LaTeX legible.\n" +
                "- Mantén títulos, numeración y viñetas; respeta saltos de línea razonables.\n" +
                "- No inventes: si algo es ilegible, omite solo esa parte.\n" +
                "- Si no hay texto legible, responde exactamente: SIN_TEXTO",
            },
            // `detail: high` improves OCR for small text (supported by vision models).
            { type: "input_image", image_url: dataUrl, detail: "high" },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    let message = "";
    try {
      const json = (await res.json()) as { error?: { message?: string } };
      message = json.error?.message ?? "";
    } catch {
      message = (await res.text()).slice(0, 240);
    }

    if (res.status === 429) {
      return (
        "OCR no disponible ahora: tu cuenta de OpenAI se quedó sin cuota/saldo (HTTP 429). " +
        "Entra a OpenAI Platform → Billing/Usage, añade método de pago o aumenta límites, " +
        "y luego reintenta."
      );
    }

    return `OCR failed (HTTP ${res.status}): ${message || "Unknown error"}`;
  }

  const json = (await res.json()) as unknown;
  const extracted = repairSpuriousAmpersandOcrText(extractTextFromOpenAIResponses(json));
  const trimmed = extracted.trim();
  if (!trimmed || trimmed === "SIN_TEXTO") {
    return "(sin texto legible en la imagen)";
  }
  return trimmed;
}

function extractTextFromOpenAIResponses(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const root = payload as Record<string, unknown>;

  // Prefer strictly reading only "output_text" content blocks from the Responses API structure,
  // instead of recursively collecting every string (which can include ids, model names, etc.).
  const output = root.output;
  if (Array.isArray(output)) {
    const chunks: string[] = [];
    for (const item of output) {
      if (!item || typeof item !== "object") continue;
      const content = (item as Record<string, unknown>).content;
      if (!Array.isArray(content)) continue;
      for (const c of content) {
        if (!c || typeof c !== "object") continue;
        const obj = c as Record<string, unknown>;
        if (obj.type !== "output_text") continue;
        const text = obj.text;
        if (typeof text === "string" && text.trim()) chunks.push(text.trim());
      }
    }
    if (chunks.length) return stripOpenAiResponseLeakage(chunks.join("\n\n").trim());
  }

  // Some API versions expose a convenience field; it may include leaked metadata — sanitize.
  if (typeof root.output_text === "string" && root.output_text.trim()) {
    return stripOpenAiResponseLeakage(root.output_text.trim());
  }

  // Fallback: if the payload doesn't match expected structure, collect ONLY output_text blocks.
  const parts: string[] = [];
  collectOpenAIOutputTextOnly(payload, parts);
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const p of parts) {
    const t = p.trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    if (/^(resp|msg)_[a-z0-9]+$/i.test(t)) continue;
    if (/^gpt-\S+$/i.test(t)) continue;
    if (t.toLowerCase() === "output_text") continue;
    seen.add(t);
    deduped.push(t);
  }
  return stripOpenAiResponseLeakage(deduped.join("\n").trim());
}

function collectOpenAIOutputTextOnly(node: unknown, out: string[]): void {
  if (!node) return;

  if (typeof node === "string") {
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) collectOpenAIOutputTextOnly(item, out);
    return;
  }

  if (typeof node !== "object") return;

  const obj = node as Record<string, unknown>;

  const type = obj.type;
  const text = obj.text;
  if (typeof type === "string" && typeof text === "string" && text.trim()) {
    if (type === "output_text") {
      out.push(text);
    }
  }

  for (const value of Object.values(obj)) {
    collectOpenAIOutputTextOnly(value, out);
  }
}

export async function POST(req: Request) {
  const ip = getClientIpKey(req);
  const limits = rescueExtractRateLimits();
  const rl = tryConsumeRateToken(`rescue_extract:${ip}`, limits.max, limits.windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const quota = await consumeDailyUserQuota(
    "rescue_extract",
    parseInt(process.env.API_DAILY_LIMIT_RESCUE_EXTRACT ?? "5", 10),
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
    return await runOpenAiRoute("rescue_extract", async () => {
      const form = await req.formData();
      const raw = form.getAll("files");
      const files = raw.filter((x): x is File => x instanceof File);

      if (files.length === 0) {
        return NextResponse.json({ files: [], combinedText: "" });
      }

      const extracted: ExtractedFile[] = [];
      for (const f of files) {
        const name = f.name || "file";
        const mime = f.type || "application/octet-stream";
        const size = f.size ?? 0;

        if (isPdf(mime, name)) {
          const buf = Buffer.from(await f.arrayBuffer());
          // `pdf-parse` v2 exports a class (`PDFParse`), not a callable function like v1.
          const { PDFParse } = await import("pdf-parse");
          const parser = new PDFParse({ data: buf });
          try {
            const parsed = await parser.getText();
            extracted.push({ name, type: mime, size, text: (parsed.text || "").trim() });
          } finally {
            await parser.destroy();
          }
          continue;
        }

        if (isImage(mime, name)) {
          const text = await ocrImageWithOpenAI(f);
          extracted.push({ name, type: mime, size, text });
          continue;
        }

        if (isTextLike(mime, name)) {
          const text = (await f.text()).trim();
          extracted.push({ name, type: mime, size, text });
          continue;
        }

        extracted.push({
          name,
          type: mime,
          size,
          text: `[Unsupported file type for extraction yet: ${name} (${mime}). Try PDF or TXT for now.]`,
        });
      }

      const combinedText = extracted
        .map((e) => `# ${e.name}\n${e.text}`.trim())
        .filter(Boolean)
        .join("\n\n");

      return NextResponse.json({ files: extracted, combinedText });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

