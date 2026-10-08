/**
 * Fecha corta en español sin ambigüedad: "20 jul" dentro del año actual y
 * "20 jul 2025" en cualquier otro año (nunca hay que adivinar de qué año es).
 */
export function formatShortDateEs(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return String(input);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(
    "es-VE",
    sameYear
      ? { day: "numeric", month: "short" }
      : { day: "numeric", month: "short", year: "numeric" },
  );
}
