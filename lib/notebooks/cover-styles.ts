/**
 * Deterministic "notebook cover" visuals from subject name (no extra DB fields).
 */

export function hashSubject(subject: string): number {
  let h = 2166136261;
  const s = subject.trim() || "General";
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function initialsFromSubject(subject: string): string {
  const s = subject.trim() || "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0] ?? "";
    const b = parts[1][0] ?? "";
    return (a + b).toUpperCase().slice(0, 2);
  }
  if (s.length >= 2) return s.slice(0, 2).toUpperCase();
  return s.charAt(0).toUpperCase();
}

/** CSS linear-gradient for cover + slightly different spine shade */
export function notebookCoverGradient(subject: string): { background: string; spine: string } {
  const h = hashSubject(subject);
  const hue1 = h % 360;
  const hue2 = (hue1 + 28 + (h % 40)) % 360;
  const hue3 = (hue1 + 180) % 360;
  const background = `linear-gradient(145deg, hsl(${hue1} 42% 22%) 0%, hsl(${hue2} 48% 14%) 55%, hsl(${hue3} 35% 10%) 100%)`;
  const spine = `linear-gradient(180deg, hsl(${hue1} 50% 12%), hsl(${hue2} 45% 8%))`;
  return { background, spine };
}
