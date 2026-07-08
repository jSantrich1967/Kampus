/** Vercel serverless body limit is ~4.5 MB; stay under to avoid 413 HTML responses. */
export const MAX_RESCUE_EXTRACT_BYTES = 4 * 1024 * 1024;

const EXTRACTABLE_EXT = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".md", ".csv"]);

export function isRescueExtractSupportedFile(name: string, mime: string): boolean {
  const lower = name.toLowerCase();
  if (mime.startsWith("image/") || mime.startsWith("text/")) return true;
  if (mime === "application/pdf") return true;
  for (const ext of EXTRACTABLE_EXT) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

export function rescueExtractRejectReason(file: File): string | null {
  if (file.size > MAX_RESCUE_EXTRACT_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return (
      `“${file.name}” pesa ${mb} MB. En producción solo podemos extraer texto de archivos de hasta ~4 MB. ` +
      "Exporta a PDF (texto seleccionable) o PNG/JPG más pequeños, o súbelo a Mis cuadernos sin extracción."
    );
  }
  const mime = file.type || "application/octet-stream";
  if (!isRescueExtractSupportedFile(file.name, mime)) {
    return (
      `“${file.name}” no es un tipo soportado para extracción (usa PDF, PNG, JPG, TXT o MD). ` +
      "PowerPoint (.pptx) aún no está soportado."
    );
  }
  return null;
}

export async function readRescueExtractJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    const low = text.toLowerCase();
    if (res.status === 413 || low.includes("request entity too large") || low.includes("payload too large")) {
      throw new Error(
        "El archivo es demasiado grande para el servidor (~4 MB máx. en extracción). " +
          "Usa PDF/PNG más pequeños o guarda el archivo en Mis cuadernos.",
      );
    }
    throw new Error(
      res.ok
        ? "Respuesta inválida del servidor al leer el archivo."
        : `No se pudo leer el archivo (HTTP ${res.status}).`,
    );
  }
}
