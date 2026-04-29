import { generateRescuePack, type RescuePack } from "@/lib/class-rescue";

export type RescuePackApiBody = {
  subjectHint: string;
  sourceLabel: string;
  sourceKind?: string;
  extractedFileText: string;
  notes: string;
  link: string;
  uploadedFileCount: number;
  seedText: string;
  /** Hint for server to generate a shorter/faster pack. */
  packMode?: "lite" | "full";
};

export type RescuePackFallbackInput = {
  seedText: string;
  subjectHint: string;
  sourceLabel: string;
  sourceKind?: string;
};

/**
 * Calls `/api/rescue/pack` and falls back to a deterministic pack if the request fails.
 */
export async function postRescuePack(
  body: RescuePackApiBody,
  fallback: RescuePackFallbackInput,
): Promise<{ pack: RescuePack; packError: string | null }> {
  try {
    const timeoutMs = body.packMode === "lite" ? 20000 : 30000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch("/api/rescue/pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const json = (await res.json()) as { pack?: RescuePack; error?: string };
    if (!res.ok) throw new Error(json.error || "No pudimos generar el kit.");
    if (!json.pack) throw new Error("Respuesta incompleta del servidor.");
    return { pack: json.pack, packError: null };
  } catch (e) {
    const raw = e instanceof Error ? e.message : "No pudimos generar el kit.";
    const msg =
      raw === "Failed to fetch"
        ? "No se pudo conectar con el servidor para generar el kit. Reintenta en unos segundos."
        : raw.includes("aborted")
          ? "La generación tardó demasiado y la cortamos para que no se quede colgada. Se mostró un kit básico."
          : raw;
    return {
      pack: generateRescuePack({
        seedText: fallback.seedText,
        subjectHint: fallback.subjectHint,
        sourceLabel: fallback.sourceLabel,
        sourceKind: fallback.sourceKind,
      }),
      packError: msg,
    };
  }
}
