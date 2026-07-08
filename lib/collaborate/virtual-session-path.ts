import { parsePresentationDeckId, buildPresentationDeckHref } from "@/lib/collaborate/presentation-path";

export function buildVirtualSessionHref(sessionId: string): string {
  return `/collaborate/aula-virtual/${encodeURIComponent(sessionId)}`;
}

/** Deep link from aula session card to linked presentation deck (if any). */
export function buildSessionPresentationHref(sessionId: string, presentationUrl: string | null | undefined): string {
  const deckId = parsePresentationDeckId(presentationUrl);
  const base = deckId ? buildPresentationDeckHref(deckId) : "/collaborate/exposiciones";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}from=aula&session=${encodeURIComponent(sessionId)}`;
}
