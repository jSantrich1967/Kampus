import { LOCAL_ONLY_PRESENTATION_ID } from "@/lib/calendar/agenda-events";

export function buildPresentationDeckHref(deckId: string | null | undefined): string {
  const id = deckId?.trim();
  if (!id || id === LOCAL_ONLY_PRESENTATION_ID) return "/collaborate/exposiciones";
  return `/collaborate/exposiciones?deck=${encodeURIComponent(id)}`;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Extract deck id from raw uuid, ?deck= query, or full presentation URL. */
export function parsePresentationDeckId(raw: string | null | undefined): string | null {
  const s = raw?.trim();
  if (!s) return null;
  if (UUID_RE.test(s)) return s;
  try {
    const url = s.startsWith("http") ? new URL(s) : new URL(s, "https://kampus.local");
    const deck = url.searchParams.get("deck")?.trim();
    if (deck && UUID_RE.test(deck)) return deck;
  } catch {
    /* ignore malformed URLs */
  }
  const m = s.match(/[?&]deck=([0-9a-f-]{36})/i);
  if (m?.[1] && UUID_RE.test(m[1])) return m[1];
  return null;
}
