/** Empty text means the teacher left the grade blank. A number must be from 0 to 20. */
export function parseCourseGrade(value: string): { ok: true; grade: number | null } | { ok: false } {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return { ok: true, grade: null };
  const grade = Number(trimmed);
  if (!Number.isFinite(grade) || grade < 0 || grade > 20) return { ok: false };
  return { ok: true, grade: Math.round(grade * 10) / 10 };
}
