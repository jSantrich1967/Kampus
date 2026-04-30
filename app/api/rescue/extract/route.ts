import { NextResponse } from "next/server";

export const runtime = "nodejs";

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

  const mime = file.type || "image/png";
  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");
  const dataUrl = `data:${mime};base64,${base64}`;

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Eres un motor de OCR. Extrae el texto de la imagen y devuelve SOLO el texto (sin explicaciones, sin JSON, sin etiquetas, sin metadatos). " +
                "Reglas: " +
                "1) Mantén la estructura: títulos, numeración, viñetas y saltos de línea. " +
                "2) No inventes contenido. Si una parte no se entiende, omítela. " +
                "3) Evita basura tipo IDs, tokens, 'output_text', 'assistant', 'in_memory', etc. " +
                "4) Si hay fórmulas, escríbelas en texto plano lo mejor posible. " +
                "Si la imagen no tiene texto legible, responde exactamente: SIN_TEXTO",
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
  const extracted = extractTextFromOpenAIResponses(json);
  const trimmed = extracted.trim();
  if (!trimmed || trimmed === "SIN_TEXTO") {
    return "(sin texto legible en la imagen)";
  }
  return trimmed;
}

function extractTextFromOpenAIResponses(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const root = payload as Record<string, unknown>;

  // Some SDKs / API versions expose a convenience field.
  if (typeof root.output_text === "string" && root.output_text.trim()) return root.output_text;

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
    if (chunks.length) return chunks.join("\n\n").trim();
  }

  // Fallback: if the payload doesn't match expected structure, use conservative collector.
  const parts: string[] = [];
  collectOpenAIResponseText(payload, parts);
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const p of parts) {
    const t = p.trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    // Avoid obvious metadata strings in fallback mode.
    if (/^(resp|msg)_[a-z0-9]+$/i.test(t)) continue;
    if (/^gpt-\S+$/i.test(t)) continue;
    if (t.toLowerCase() === "output_text") continue;
    seen.add(t);
    deduped.push(t);
  }
  return deduped.join("\n").trim();
}

function collectOpenAIResponseText(node: unknown, out: string[]): void {
  if (!node) return;

  if (typeof node === "string") {
    if (node.trim()) out.push(node);
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) collectOpenAIResponseText(item, out);
    return;
  }

  if (typeof node !== "object") return;

  const obj = node as Record<string, unknown>;

  const type = obj.type;
  const text = obj.text;
  if (typeof type === "string" && typeof text === "string" && text.trim()) {
    // Most text-bearing blocks in Responses API use types like output_text / input_text.
    if (type.endsWith("text")) {
      out.push(text);
    }
  }

  for (const value of Object.values(obj)) {
    collectOpenAIResponseText(value, out);
  }
}

export async function POST(req: Request) {
  try {
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
        // `pdf-parse` ESM export is `PDFParse`, not a default export (Next/Turbopack builds are ESM).
        const mod = (await import("pdf-parse")) as unknown as { PDFParse: (data: Buffer) => Promise<{ text?: string }> };
        const parsed = await mod.PDFParse(buf);
        extracted.push({ name, type: mime, size, text: (parsed.text || "").trim() });
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

