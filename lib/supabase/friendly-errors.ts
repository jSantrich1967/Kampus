// Errores de infraestructura (Supabase/Postgres/RLS) nunca deben llegar a la
// pantalla: hablan de políticas, relaciones, variables de entorno o códigos
// internos que no significan nada para el estudiante y erosionan la confianza.
// Usa esta función en cada catch que muestre un error al usuario.

const INFRA_PATTERNS = [
  /policy/i,
  /relation "/i,
  /recursion/i,
  /row-level security/i,
  /permission denied/i,
  /supabase/i,
  /service_?role/i,
  /pgrst/i,
  /\b42p\d\d\b/i,
  /\b22\d\d\d\b/i,
  /jwt/i,
  /duplicate key/i,
  /null value in column/i,
  /does not exist/i,
  /failed to fetch/i,
  /networkerror/i,
  /timeout/i,
];

export function friendlySupabaseError(fallback: string, raw?: unknown): string {
  const msg =
    typeof raw === "string"
      ? raw
      : raw instanceof Error
        ? raw.message
        : "";
  // Si el mensaje crudo parece humano y corto, úsalo; si huele a
  // infraestructura, o no hay mensaje, usa el texto amable.
  if (msg && msg.length <= 120 && !INFRA_PATTERNS.some((p) => p.test(msg))) {
    return msg;
  }
  return fallback;
}
