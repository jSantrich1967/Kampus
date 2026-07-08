/**
 * Removes the legacy combined-extract first line `# filename.ext` when it matches the source file.
 * (Upload used to store `combinedText`, which always prefixed that header.)
 */
export function stripLeadingNotebookFilenameHeader(raw: string, sourceFilename?: string | null): string {
  const fn = (sourceFilename ?? "").trim();
  const s = (raw ?? "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (!fn) return s;
  const lines = s.split("\n");
  const first = lines[0]?.trim();
  if (first === `# ${fn}`) {
    return lines.slice(1).join("\n");
  }
  return s;
}

/**
 * Strip lines that sometimes leak from OpenAI Responses payloads into OCR output
 * (response ids, message ids, model slugs, status labels). Does not rewrite note content.
 */
export function stripOpenAiResponseLeakage(raw: string): string {
  const text = (raw ?? "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const out: string[] = [];

  const noiseWords = new Set([
    "response",
    "completed",
    "developer",
    "message",
    "assistant",
    "user",
    "system",
    "output_text",
    "input_text",
    "tool_calls",
    "reasoning",
    "pending",
    "failed",
    "in_progress",
    "incomplete",
    "cancelled",
    "canceled",
  ]);

  for (const line of lines) {
    let t = line.trim();
    if (!t) {
      out.push(line);
      continue;
    }

    // Strip inline OpenAI ids that leak into OCR output (e.g. "# file.png resp_abc123").
    t = t.replace(/\b(resp|msg)_[A-Za-z0-9_\-]+\b/gi, "").replace(/\s{2,}/g, " ").trim();
    if (!t) continue;
    const headerOnly = /^#\s*.+\.(png|jpe?g|webp|gif|pdf)$/i.test(t);
    if (headerOnly) continue;

    const low = t.toLowerCase();

    // OpenAI response / message ids (allow mixed-case hex tail).
    if (/^(resp|msg)_[A-Za-z0-9_\-]+$/i.test(t)) continue;
    if (/^chatcmpl-[a-z0-9_\-]+$/i.test(t)) continue;
    if (/^gpt-[0-9a-z.\-]+$/i.test(low)) continue;
    if (noiseWords.has(low)) continue;
    if (/^"(response|message|id|object|created|model|choices|status|type)"\s*:/i.test(t)) continue;

    out.push(t);
  }

  return out
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}
