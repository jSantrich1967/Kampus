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
    const res = await fetch("/api/rescue/pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { pack?: RescuePack; error?: string };
    if (!res.ok) throw new Error(json.error || "No pudimos generar el kit.");
    if (!json.pack) throw new Error("Respuesta incompleta del servidor.");
    return { pack: json.pack, packError: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No pudimos generar el kit.";
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
