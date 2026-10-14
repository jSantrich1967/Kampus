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

/**
 * Versión del prompt de generación. Al cambiar el prompt (requisitos, modelo,
 * temperatura), se sube este número y el caché anterior caduca solo.
 */
export const VISUALIZE_PROMPT_VERSION = 3;

/** Hash estable para la columna topic_hash (caché compartido). */
export function topicHash(subject: string, topic: string): string {
  return createHash("sha256")
    .update(`${VISUALIZE_PROMPT_VERSION}|${normalizeTopicKey(subject, topic)}`, "utf8")
    .digest("hex");
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
 * - Si trae controles interactivos (sliders, botones), deben estar cableados
 *   (addEventListener o atributos on*): controles decorativos no cuentan.
 */
export type SimulationInvalidReason =
  | "empty"
  | "no-visual"
  | "external-resource"
  | "controls-not-wired";

/**
 * Sanea el HTML del modelo: elimina recursos externos (scripts con src,
 * @import como Google Fonts, src/href http, url(http...)) en vez de
 * rechazar la simulación completa. El diseño cae a fuentes del sistema,
 * pero la simulación sigue funcionando.
 */
export function sanitizeSimulationHtml(html: string): string {
  let out = html;
  out = out.replace(/<script[^>]+src\s*=[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  out = out.replace(/@import\s+[^;]+;/gi, "");
  out = out.replace(/\s(?:src|href)\s*=\s*["']https?:\/\/[^"']*["']/gi, "");
  out = out.replace(/url\(\s*["']?https?:\/\/[^)"']*["']?\s*\)/gi, "url()");
  return out;
}

/**
 * Valida y explica QUÉ falló (para mensajes de error específicos).
 */
export function validateSimulationHtml(html: string): { ok: true } | { ok: false; reason: SimulationInvalidReason } {
  if (!html || !html.trim()) return { ok: false, reason: "empty" };
  const lower = html.toLowerCase();
  const hasDoc = lower.includes("<html") || lower.includes("<!doctype");
  const hasVisual = lower.includes("<svg") || lower.includes("<canvas");
  if (!hasDoc && !hasVisual) return { ok: false, reason: "no-visual" };
  if (/<script[^>]+src\s*=/i.test(html)) return { ok: false, reason: "external-resource" };
  if (/@import/i.test(html)) return { ok: false, reason: "external-resource" };
  if (/\b(src|href)\s*=\s*["']https?:\/\//i.test(html)) return { ok: false, reason: "external-resource" };
  if (/url\(\s*["']?https?:\/\//i.test(html)) return { ok: false, reason: "external-resource" };
  const hasControls = /<input[^>]+type\s*=\s*["']?range/i.test(html) || /<button/i.test(html);
  const hasWiring = /addEventListener/i.test(html) || /\son\w+\s*=/i.test(html);
  if (hasControls && !hasWiring) return { ok: false, reason: "controls-not-wired" };
  return { ok: true };
}

export function isValidSimulationHtml(html: string): boolean {
  return validateSimulationHtml(html).ok;
}

export function htmlByteSize(html: string): number {
  return Buffer.byteLength(html, "utf8");
}
