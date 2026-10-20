/**
 * Algoritmo SM-2 de repetición espaciada (SuperMemo).
 *
 * Matemática local, sin IA: no consume presupuesto de IA.
 *
 * Estado por tarjeta:
 * - easiness: factor de facilidad (empieza en 2.5, mínimo 1.3)
 * - intervalDays: días hasta el próximo repaso
 * - reps: racha de recuerdos correctos consecutivos
 * - lapses: veces que se olvidó (quality < 3)
 *
 * Calificación (la UI ofrece 3 botones):
 * - "No me la sabía" → quality 1
 * - "Dudé" → quality 3
 * - "La sabía" → quality 5
 */

export type ReviewState = {
  easiness: number;
  intervalDays: number;
  /** Consecutive correct streak. Resets when the card is forgotten. */
  reps: number;
  /** Times the card was forgotten. Never resets. */
  lapses: number;
  /** Correct recalls that are kept after a lapse. Used for mastery, not for SM-2 intervals. */
  successes?: number;
};

export type GradedReview = ReviewState & {
  /** Cuándo vence el próximo repaso. */
  nextDue: Date;
};

export const INITIAL_REVIEW_STATE: ReviewState = {
  easiness: 2.5,
  intervalDays: 0,
  reps: 0,
  lapses: 0,
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASINESS = 1.3;

function clampQuality(quality: number): number {
  if (!Number.isFinite(quality)) return 0;
  return Math.min(5, Math.max(0, Math.round(quality)));
}

/**
 * Aplica una calificación SM-2 y devuelve el nuevo estado de la tarjeta.
 * SM-2 estándar: si quality < 3 la racha se reinicia (reaprender, intervalo
 * de 1 día); si no, el intervalo crece (1, 6, luego intervalo × easiness).
 */
export function gradeReview(
  item: ReviewState,
  quality: number,
  now: Date = new Date(),
): GradedReview {
  const q = clampQuality(quality);
  let { easiness, intervalDays, reps, lapses } = item;
  let successes = item.successes ?? item.reps;

  if (q < 3) {
    reps = 0;
    lapses += 1;
    intervalDays = 1;
  } else {
    reps += 1;
    successes += 1;
    if (reps === 1) intervalDays = 1;
    else if (reps === 2) intervalDays = 6;
    else intervalDays = Math.max(1, Math.round(intervalDays * easiness));
  }

  easiness = Math.max(
    MIN_EASINESS,
    easiness + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );

  return {
    easiness,
    intervalDays,
    reps,
    lapses,
    successes,
    nextDue: new Date(now.getTime() + intervalDays * DAY_MS),
  };
}
