export function normalizeStudyRoomCode(raw: string | null | undefined): string {
  const s = raw?.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") ?? "";
  return s || "default";
}

export function generateStudyRoomCode(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function buildStudyRoomHref(room?: string, title?: string, extras?: { video?: string }): string {
  const qs = new URLSearchParams();
  if (room?.trim()) qs.set("room", normalizeStudyRoomCode(room));
  if (title?.trim()) qs.set("title", title.trim());
  if (extras?.video?.trim()) qs.set("video", extras.video.trim());
  const q = qs.toString();
  return q ? `/collaborate/sala-estudio?${q}` : "/collaborate/sala-estudio";
}
