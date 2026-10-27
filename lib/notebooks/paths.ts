/**
 * Build safe Storage path segments (ASCII, no path traversal).
 */

export function subjectToPathSegment(subject: string): string {
  const s = subject
    .normalize("NFD")
    // Combining marks (Latin accents); avoids `\p{M}` for older JS runtimes.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return s || "general";
}

/** The library name that belongs to a notebook link. "calculo" becomes "Cálculo". */
export function displaySubjectForSlug(slug: string, names: readonly string[]): string | null {
  const target = slug.trim();
  if (!target) return null;
  const matches = names
    .map((name) => name.trim())
    .filter((name) => name.length > 0 && subjectToPathSegment(name) === target);
  if (matches.length === 0) return null;
  return matches.find((name) => name !== target) ?? matches[0] ?? null;
}

export function sanitizeStorageFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").slice(0, 120);
  return base || "file";
}
