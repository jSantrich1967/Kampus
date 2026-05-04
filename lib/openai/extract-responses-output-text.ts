/**
 * Obtiene el texto visible del asistente desde la respuesta JSON de OpenAI Responses API.
 * No recorre todo el árbol: evita mezclar metadatos (modelo, ids, roles, estados) en el chat.
 */
export function extractResponsesOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const root = payload as Record<string, unknown>;

  if (typeof root.output_text === "string" && root.output_text.trim()) {
    return root.output_text.trim();
  }

  const output = root.output;
  if (!Array.isArray(output)) return "";

  const chunks: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const block = item as Record<string, unknown>;

    if (block.type !== "message") continue;

    const content = block.content;
    if (!Array.isArray(content)) continue;

    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const p = part as Record<string, unknown>;
      const pType = p.type;
      const text = p.text;
      if (typeof text !== "string" || !text.trim()) continue;
      if (pType === "output_text" || pType === "text") {
        chunks.push(text.trim());
      }
    }
  }

  if (chunks.length === 0) return "";

  const deduped: string[] = [];
  for (const c of chunks) {
    if (deduped.length > 0 && deduped[deduped.length - 1] === c) continue;
    deduped.push(c);
  }

  return deduped.join("\n\n").trim();
}
