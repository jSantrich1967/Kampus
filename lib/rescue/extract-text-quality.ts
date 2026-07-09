export const MIN_USEFUL_EXTRACT_CHARS = 25;

/** Strip filename headers and notebook tag lines before judging usefulness. */
export function stripExtractFormattingNoise(text: string): string {
  return text
    .replace(/^#\s+.+\n+/m, "")
    .replace(/^(Materia|Tema|Punto|Ejercicios prácticos):.+\n?/gim, "")
    .replace(/\(sin texto extraído[^)]*\)/gi, "")
    .replace(/\(sin texto legible[^)]*\)/gi, "")
    .trim();
}

/** True when extracted/OCR text is substantial enough to ground study kits. */
export function isUsefulExtractedText(text: string): boolean {
  const body = stripExtractFormattingNoise(text);
  if (!body) return false;
  const lower = body.toLowerCase();
  if (lower.includes("sin texto") || lower.includes("no text") || lower.includes("missing openai")) return false;
  if (lower.includes("ocr failed") || lower.includes("ocr no disponible")) return false;
  if (lower.includes("unsupported file type for extraction")) return false;
  if (lower.includes("problemas con el texto extraído")) return false;
  if (lower.includes("material insuficiente")) return false;
  if (/\b(resp|msg)_[a-z0-9_\-]{8,}\b/i.test(body)) return false;
  if (body.replace(/\s+/g, "").length < MIN_USEFUL_EXTRACT_CHARS) return false;
  return true;
}
