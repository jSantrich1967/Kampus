/**
 * Identidad pública de un usuario para mostrar junto a su contenido
 * (Comunidad, Duelos): SOLO nombre visible y foto. El body completo del
 * perfil (teléfono, etc.) nunca sale del servidor: /api/avatars recorta.
 */

export type PublicProfile = { name: string; avatarUrl: string };

export const FALLBACK_PUBLIC_NAME = "Estudiante";

/** Construye el mapa id → identidad pública desde filas de profiles. Función pura. */
export function buildPublicProfileMap(
  rows: { id: string; body: unknown }[],
): Record<string, PublicProfile> {
  const out: Record<string, PublicProfile> = {};
  for (const row of rows) {
    const body = (row.body ?? {}) as { displayName?: unknown; avatarUrl?: unknown };
    const name =
      typeof body.displayName === "string" && body.displayName.trim() ? body.displayName.trim() : FALLBACK_PUBLIC_NAME;
    const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl : "";
    out[row.id] = { name, avatarUrl };
  }
  return out;
}

const cache = new Map<string, PublicProfile>();

/** Pide al servidor la identidad pública de esos usuarios (con caché de sesión). */
export async function fetchPublicProfiles(userIds: string[]): Promise<Record<string, PublicProfile>> {
  const unique = [...new Set(userIds)].filter(Boolean);
  const missing = unique.filter((id) => !cache.has(id));
  if (missing.length > 0) {
    try {
      const res = await fetch("/api/avatars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: missing.slice(0, 60) }),
      });
      if (res.ok) {
        const json = (await res.json()) as { profiles?: Record<string, PublicProfile> };
        for (const [id, p] of Object.entries(json.profiles ?? {})) cache.set(id, p);
      }
    } catch {
      // Sin red o sin sesión: los componentes caen al nombre genérico e iniciales.
    }
    for (const id of missing) {
      if (!cache.has(id)) cache.set(id, { name: FALLBACK_PUBLIC_NAME, avatarUrl: "" });
    }
  }
  const out: Record<string, PublicProfile> = {};
  for (const id of unique) {
    const p = cache.get(id);
    if (p) out[id] = p;
  }
  return out;
}
