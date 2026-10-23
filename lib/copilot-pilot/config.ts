/**
 * Piloto CopilotKit — configuración.
 *
 * El piloto es ADITIVO y está APAGADO por defecto: solo se monta la UI y
 * solo responde la ruta /api/copilotkit cuando
 * NEXT_PUBLIC_COPILOT_PILOT_ENABLED="true" (mismo patrón que
 * NEXT_PUBLIC_GOOGLE_AUTH_ENABLED). Sin la bandera, el piloto no existe
 * para el usuario y la ruta devuelve 404.
 */

export const COPILOT_PILOT_QUOTA_KEY = "copilot_pilot";

type EnvLike = Record<string, string | undefined>;

export function isCopilotPilotEnabled(env: EnvLike = process.env): boolean {
  return env.NEXT_PUBLIC_COPILOT_PILOT_ENABLED === "true";
}

/** Límite diario por usuario del piloto (cuota `consume_api_quota`). */
export function copilotPilotDailyLimit(env: EnvLike = process.env): number {
  const parsed = parseInt(env.API_DAILY_LIMIT_COPILOT_PILOT ?? "30", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}
