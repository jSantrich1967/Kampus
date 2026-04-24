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
  const model = process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4.1-mini";
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
                "Extrae el texto de esta imagen (OCR) y devuelve SOLO el texto legible. " +
                "Si es una diapositiva o apunte, conserva títulos y viñetas. " +
                "Si no hay texto, responde: (sin texto).",
            },
            { type: "input_image", image_url: dataUrl },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return `[OCR failed: ${res.status}. ${body.slice(0, 240)}]`;
  }

  const json = (await res.json()) as { output_text?: string };
  return (json.output_text || "").trim() || "(sin texto)";
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

