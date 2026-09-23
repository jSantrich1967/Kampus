import { fetchOpenAi } from "@/lib/observability/openai-sentry";
import { stripOpenAiResponseLeakage } from "@/lib/notebooks/openai-extract-cleanup";
import { repairSpuriousAmpersandOcrText } from "@/lib/notebooks/ocr-text-repair";
import { isUsefulExtractedText } from "@/lib/rescue/extract-text-quality";
import { loadPdfParseClass, CanvasFactory } from "@/lib/rescue/pdf-parse-node-setup";

const OPENAI_OCR_PROMPT =
  "Eres un motor OCR de alta precisión. Transcribe TODO el texto visible en la imagen.\n\n" +
  "SALIDA:\n" +
  "- Devuelve SOLO la transcripción. Sin explicaciones, sin JSON, sin etiquetas, sin metadatos ni IDs.\n" +
  "- Prosa y listas: español normal con tildes y puntuación correctas.\n" +
  "- Ecuaciones y fórmulas matemáticas: usa LaTeX entre $...$ (en línea) o $$...$$ (bloque).\n" +
  "- PROHIBIDO colocar el carácter & entre letras o símbolos para separar caracteres.\n" +
  "- PROHIBIDO deletrear fórmulas con &; escribe LaTeX legible.\n" +
  "- Mantén títulos, numeración y viñetas; respeta saltos de línea razonables.\n" +
  "- No inventes: si algo es ilegible, omite solo esa parte.\n" +
  "- Si no hay texto legible, responde exactamente: SIN_TEXTO";

export type ExtractFileInput = {
  buffer: Buffer;
  name: string;
  mime: string;
  size: number;
};

function pdfOcrMaxPages(): number {
  const n = parseInt(process.env.PDF_OCR_MAX_PAGES ?? "5", 10);
  if (!Number.isFinite(n)) return 5;
  return Math.min(Math.max(n, 1), 15);
}

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

async function preprocessImageBufferForOcrDataUrl(buf: Buffer, inputMime: string): Promise<string> {
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

    const processed = await sharp(buf, { failOn: "none" })
      .rotate()
      .resize({ width: 2000, withoutEnlargement: false, fit: "inside" })
      .grayscale()
      .normalize()
      .sharpen()
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();

    return `data:image/png;base64,${processed.toString("base64")}`;
  } catch {
    return `data:${inputMime};base64,${buf.toString("base64")}`;
  }
}

function extractTextFromOpenAIResponses(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const root = payload as Record<string, unknown>;
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

  if (typeof root.output_text === "string" && root.output_text.trim()) {
    return stripOpenAiResponseLeakage(root.output_text.trim());
  }

  const parts: string[] = [];
  collectOpenAIOutputTextOnly(payload, parts);
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const p of parts) {
    const t = p.trim();
    if (!t || seen.has(t)) continue;
    if (/^(resp|msg)_[a-z0-9]+$/i.test(t)) continue;
    if (/^gpt-\S+$/i.test(t)) continue;
    seen.add(t);
    deduped.push(t);
  }
  return stripOpenAiResponseLeakage(deduped.join("\n").trim());
}

function collectOpenAIOutputTextOnly(node: unknown, out: string[]): void {
  if (!node || typeof node === "string") return;
  if (Array.isArray(node)) {
    for (const item of node) collectOpenAIOutputTextOnly(item, out);
    return;
  }
  if (typeof node !== "object") return;

  const obj = node as Record<string, unknown>;
  const type = obj.type;
  const text = obj.text;
  if (typeof type === "string" && typeof text === "string" && text.trim() && type === "output_text") {
    out.push(text);
  }
  for (const value of Object.values(obj)) {
    collectOpenAIOutputTextOnly(value, out);
  }
}

async function ocrDataUrlWithOpenAI(dataUrl: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4.1";
  if (!apiKey) {
    return "[Missing OPENAI_API_KEY on the server. Add it in Vercel env vars to enable OCR for images.]";
  }

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
            { type: "input_text", text: OPENAI_OCR_PROMPT },
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

    return `No pudimos leer el texto de la imagen. Inténtalo de nuevo con una foto más nítida.`;
  }

  const json = (await res.json()) as unknown;
  const extracted = repairSpuriousAmpersandOcrText(extractTextFromOpenAIResponses(json));
  const trimmed = extracted.trim();
  if (!trimmed || trimmed === "SIN_TEXTO") {
    return "(sin texto legible en la imagen)";
  }
  return trimmed;
}

type PdfScreenshotParser = {
  getScreenshot: (params?: {
    first?: number;
    scale?: number;
    desiredWidth?: number;
    imageDataUrl?: boolean;
    imageBuffer?: boolean;
  }) => Promise<{ pages: Array<{ pageNumber: number; dataUrl?: string }> }>;
};

async function ocrPdfPagesWithOpenAI(parser: PdfScreenshotParser, fileLabel: string): Promise<string> {
  try {
    const shots = await parser.getScreenshot({
      first: pdfOcrMaxPages(),
      scale: 1.5,
      desiredWidth: 1600,
      imageDataUrl: true,
      imageBuffer: false,
    });

    const parts: string[] = [];
    for (const page of shots.pages) {
      const dataUrl = page.dataUrl?.trim();
      if (!dataUrl) continue;
      const pageText = await ocrDataUrlWithOpenAI(dataUrl);
      if (isUsefulExtractedText(pageText)) {
        parts.push(`## ${fileLabel} · página ${page.pageNumber}\n${pageText.trim()}`);
      }
    }
    return parts.join("\n\n");
  } catch {
    return "";
  }
}

/** Extract plain text from a file buffer (PDF with OpenAI OCR fallback, images, text). */
export async function extractFileBufferToText(input: ExtractFileInput): Promise<string> {
  const { buffer, name, mime } = input;
  const safeMime = mime || "application/octet-stream";

  if (isPdf(safeMime, name)) {
    const PDFParse = await loadPdfParseClass();
    const parser = new PDFParse({ data: buffer, CanvasFactory });
    try {
      const parsed = await parser.getText();
      let text = (parsed.text || "").trim();

      if (!isUsefulExtractedText(text)) {
        const ocrText = await ocrPdfPagesWithOpenAI(parser, name);
        if (isUsefulExtractedText(ocrText)) {
          text = ocrText.trim();
        } else if (!text) {
          text = ocrText.trim() || "(sin texto legible en el PDF)";
        }
      }

      return text;
    } finally {
      await parser.destroy();
    }
  }

  if (isImage(safeMime, name)) {
    const dataUrl = await preprocessImageBufferForOcrDataUrl(buffer, safeMime || "image/png");
    return ocrDataUrlWithOpenAI(dataUrl);
  }

  if (isTextLike(safeMime, name)) {
    return buffer.toString("utf8").trim();
  }

  return `[Unsupported file type for extraction yet: ${name} (${safeMime}). Try PDF or TXT for now.]`;
}

export function formatExtractCombinedText(name: string, text: string): string {
  return `# ${name}\n${text}`.trim();
}
