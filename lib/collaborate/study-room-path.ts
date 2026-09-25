export function normalizeStudyRoomCode(raw: string | null | undefined): string {
  const s = raw?.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") ?? "";
  return s || "default";
}

/** 10 characters from a CSPRNG. Short Math.random codes were easy to guess. */
export function generateStudyRoomCode(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function buildStudyRoomHref(room?: string, title?: string, extras?: { video?: string }): string {
  const qs = new URLSearchParams();
  if (room?.trim()) qs.set("room", normalizeStudyRoomCode(room));
  if (title?.trim()) qs.set("title", title.trim());
  if (extras?.video?.trim()) qs.set("video", extras.video.trim());
  const q = qs.toString();
  return q ? `/collaborate/sala-estudio?${q}` : "/collaborate/sala-estudio";
}
