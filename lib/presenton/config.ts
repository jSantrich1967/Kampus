/**
 * Configuración de servidor del piloto Presenton.
 *
 * SOLO servidor: `PRESENTON_API_URL` y `PRESENTON_API_KEY` nunca deben llegar al
 * cliente (sin prefijo NEXT_PUBLIC_). La API de Presenton usa una clave
 * `sk-presenton-...` como `Authorization: Bearer ...` (verificado en el README
 * oficial de presenton/presenton), NO basic auth de usuario/contraseña.
 */

export type PresentonServerConfig = {
  /** Base URL del servicio Presenton, sin barra final. Ej.: http://localhost:5001 */
  baseUrl: string;
  /** Clave API `sk-presenton-...` creada en Admin → API keys de Presenton, o null. */
  apiKey: string | null;
};

export function getPresentonServerConfig(): PresentonServerConfig | null {
  const raw = process.env.PRESENTON_API_URL?.trim();
  if (!raw) return null;
  return {
    baseUrl: raw.replace(/\/+$/, ""),
    apiKey: process.env.PRESENTON_API_KEY?.trim() || null,
  };
}

/** Clave de cuota diaria propia del piloto (RPC consume_api_quota). */
export const PRESENTON_QUOTA_KEY = "presenton_generate";

export function presentonDailyLimit(): number {
  const parsed = parseInt(process.env.API_DAILY_LIMIT_PRESENTON_GENERATE ?? "5", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}
