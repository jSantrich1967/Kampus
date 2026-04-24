import pdf from "pdf-parse";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ExtractedFile = {
  name: string;
  type: string;
  size: number;
  text: string;
};

function isTextLike(mime: string, name: string): boolean {
  if (mime.startsWith("text/")) return true;
  const lower = name.toLowerCase();
  return lower.endsWith(".md") || lower.endsWith(".txt") || lower.endsWith(".csv");
}

function isPdf(mime: string, name: string): boolean {
  if (mime === "application/pdf") return true;
  return name.toLowerCase().endsWith(".pdf");
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
        const parsed = await pdf(buf);
        extracted.push({ name, type: mime, size, text: (parsed.text || "").trim() });
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

