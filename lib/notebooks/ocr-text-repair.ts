/**
 * Vision OCR sometimes emits "stutter" lines where almost every character
 * is separated by '&' (e.g. "&E&(&y&t&)"). Remove spurious ampersands while
 * preserving intentional '&' in rare table-like lines (heuristic).
 */
export function repairSpuriousAmpersandOcrText(raw: string): string {
  const text = (raw ?? "").replace(/\r\n/g, "\n");
  if (!text.includes("&")) return text;

  const lines = text.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trimEnd();
    const compact = trimmed.replace(/\s+/g, "");

    // If the whole line is basically "&X&Y&Z..." junk, drop it entirely.
    // Example seen in OCR: "&F&a&l&t&a&...".
    if (/^(?:&\S){10,}$/.test(compact)) {
      continue;
    }

    const amp = (trimmed.match(/&/g) ?? []).length;
    const len = Math.max(trimmed.length, 1);

    // Heavy ampersand noise: strip '&' and normalize spaces.
    if (amp >= 4 && amp / len >= 0.06) {
      const cleaned = trimmed
          .replace(/&+/g, "")
          .replace(/[ \t]{2,}/g, " ")
          .trimEnd();
      if (cleaned.trim()) out.push(cleaned);
      continue;
    }

    // Medium noise with letter-digit-paren stutter: "&x&y&" style
    if (amp >= 3 && /&[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]\s*&/.test(trimmed)) {
      const cleaned = trimmed
          .replace(/&+/g, "")
          .replace(/[ \t]{2,}/g, " ")
          .trimEnd();
      if (cleaned.trim()) out.push(cleaned);
      continue;
    }

    out.push(line);
  }

  return out.join("\n");
}
