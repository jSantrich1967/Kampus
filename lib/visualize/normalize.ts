import { createHash } from "crypto";

/** Tamaño máximo aceptado para el HTML de una simulación (20 KB). */
export const VISUALIZE_MAX_HTML_BYTES = 20 * 1024;

/**
 * Normaliza "materia + tema" para que "Biología / La Célula" y
 * "biologia / la celula" compartan la misma simulación cacheada.
 */
export function normalizeTopicKey(subject: string, topic: string): string {
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  return `${norm(subject)}|${norm(topic)}`;
}

/** Hash estable para la columna topic_hash (caché compartido). */
export function topicHash(subject: string, topic: string): string {
  return createHash("sha256").update(normalizeTopicKey(subject, topic), "utf8").digest("hex");
}

/**
 * Extrae el HTML si el modelo lo envolvió en markdown (```html ... ```).
 * No inventa nada: devuelve el texto limpio tal cual.
 */
export function extractHtml(raw: string): string {
  const text = raw.trim();
  const fence = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  return (fence && fence[1] ? fence[1] : text).trim();
}

/**
 * Validación mínima de seguridad/contenido para una simulación:
 * - Debe ser un documento HTML o contener SVG/Canvas (algo visual).
 * - No puede cargar recursos externos (el iframe ya va sandboxed, pero
 *   no guardamos HTML que llame a la red).
 */
export function isValidSimulationHtml(html: string): boolean {
  const lower = html.toLowerCase();
  const hasDoc = lower.includes("<html") || lower.includes("<!doctype");
  const hasVisual = lower.includes("<svg") || lower.includes("<canvas");
  if (!hasDoc && !hasVisual) return false;
  if (/<script[^>]+src\s*=/i.test(html)) return false;
  if (/@import/i.test(html)) return false;
  if (/\b(src|href)\s*=\s*["']https?:\/\//i.test(html)) return false;
  if (/url\(\s*["']?https?:\/\//i.test(html)) return false;
  return true;
}

export function htmlByteSize(html: string): number {
  return Buffer.byteLength(html, "utf8");
}
