/**
 * Build safe Storage path segments (ASCII, no path traversal).
 */

export function subjectToPathSegment(subject: string): string {
  const s = subject
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return s || "general";
}

export function sanitizeStorageFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").slice(0, 120);
  return base || "file";
}
