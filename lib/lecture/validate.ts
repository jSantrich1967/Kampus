/**
 * Reglas de "Grabar clase" (v1): validación de la subida y gating por plan.
 *
 * Para cambiar la regla con una palabra: ajusta las constantes de abajo
 * (las FREE_ y PRO_) o las ramas que las usan en `app/api/lecture/transcribe`.
 */

/** Tamaño máximo del audio subido: 50 MB. */
export const LECTURE_MAX_BYTES = 50 * 1024 * 1024;

/** Duración máxima por grabación: gratis 10 min, Pro 90 min. */
export const FREE_MAX_SECONDS = 10 * 60;
export const PRO_MAX_SECONDS = 90 * 60;

/** Grabaciones por día: gratis 1, Pro 5. */
export const FREE_DAILY_RECORDINGS = 1;
export const PRO_DAILY_RECORDINGS = 5;

export type ServerPlan = "free" | "premium";

export function maxSecondsForPlan(plan: ServerPlan): number {
  return plan === "premium" ? PRO_MAX_SECONDS : FREE_MAX_SECONDS;
}

export function dailyLimitForPlan(plan: ServerPlan): number {
  return plan === "premium" ? PRO_DAILY_RECORDINGS : FREE_DAILY_RECORDINGS;
}

export type LectureValidation =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Valida el audio subido antes de gastar cuota de IA o transcribir.
 * Pura: fácil de probar.
 */
export function validateLectureUpload(args: {
  sizeBytes: number;
  durationSeconds: number;
  maxSeconds: number;
}): LectureValidation {
  const { sizeBytes, durationSeconds, maxSeconds } = args;

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, error: "El audio llegó vacío. Graba de nuevo." };
  }
  if (sizeBytes > LECTURE_MAX_BYTES) {
    return {
      ok: false,
      error: `El audio supera el límite de ${LECTURE_MAX_BYTES / 1024 / 1024} MB.`,
    };
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return { ok: false, error: "No pudimos medir la duración de la grabación." };
  }
  if (durationSeconds > maxSeconds) {
    const minutes = Math.round(maxSeconds / 60);
    return {
      ok: false,
      error: `La grabación supera el máximo de ${minutes} minutos de tu plan.`,
    };
  }
  return { ok: true };
}

/**
 * Una transcripción útil tiene texto real, no solo "[Música]" o ruido.
 * Si no es útil, NO se generan apuntes (nunca se inventa contenido).
 */
export function isUsefulTranscript(text: string): boolean {
  const t = text.trim();
  if (t.length < 40) return false;
  const letters = t.replace(/[^a-zA-ZáéíóúñüÁÉÍÓÚÑÜ]/g, "");
  return letters.length >= 20;
}

export function lectureQuotaExhaustedMessage(plan: ServerPlan): string {
  if (plan === "premium") {
    return "Ya usaste tus 5 grabaciones de hoy. Vuelve mañana.";
  }
  return "Ya usaste tu grabación gratis de hoy. Con Pro ($5/mes) tienes 5 grabaciones al día de hasta 90 minutos.";
}
