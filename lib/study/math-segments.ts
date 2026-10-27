export type MathSegment = { kind: "text" | "math"; value: string };

const DELIMITED = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
const LATEX_COMMAND = /\\[a-zA-Z]+(?:\{[^{}]*\})*/g;

function looksLikeFormula(value: string): boolean {
  const text = value.trim();
  if (!text || text.length > 160) return false;
  if (/[.?!]/.test(text) && text.split(/\s+/).length > 8) return false;
  return /\\[a-zA-Z]+|\^|_\{/.test(text);
}

function pushChunk(chunk: string, parts: MathSegment[]) {
  if (!chunk) return;
  if (looksLikeFormula(chunk)) {
    parts.push({ kind: "math", value: chunk.trim() });
    return;
  }
  let last = 0;
  for (const match of chunk.matchAll(LATEX_COMMAND)) {
    const start = match.index ?? 0;
    if (start > last) parts.push({ kind: "text", value: chunk.slice(last, start) });
    parts.push({ kind: "math", value: match[0] });
    last = start + match[0].length;
  }
  if (last < chunk.length) parts.push({ kind: "text", value: chunk.slice(last) });
}

/** Splits a diagnosis line into words and formulas. Dollars and commands both count. */
export function splitMathSegments(input: string): MathSegment[] {
  const text = input ?? "";
  const parts: MathSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(DELIMITED)) {
    const start = match.index ?? 0;
    if (start > last) pushChunk(text.slice(last, start), parts);
    const math = (match[1] ?? match[2] ?? "").trim();
    if (math) parts.push({ kind: "math", value: math });
    last = start + match[0].length;
  }
  pushChunk(text.slice(last), parts);
  return parts.length > 0 ? parts : [{ kind: "text", value: text }];
}
