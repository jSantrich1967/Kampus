export const MIN_USEFUL_EXTRACT_CHARS = 25;

/** True when extracted/OCR text is substantial enough to ground study kits. */
export function isUsefulExtractedText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  const lower = t.toLowerCase();
  if (lower.includes("sin texto") || lower.includes("no text") || lower.includes("missing openai")) return false;
  if (lower.includes("ocr failed") || lower.includes("ocr no disponible")) return false;
  if (lower.includes("unsupported file type for extraction")) return false;
  if (/\b(resp|msg)_[a-z0-9_\-]{8,}\b/i.test(t)) return false;
  if (t.replace(/\s+/g, "").length < MIN_USEFUL_EXTRACT_CHARS) return false;
  return true;
}
