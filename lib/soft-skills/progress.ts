import {
  COMMUNICATION_CHALLENGE,
  DIAGNOSTIC_QUESTIONS,
  ROUTE_CONTENT,
  SOFT_SKILL_DIMENSIONS,
  type RouteId,
  type SoftSkillDimensionId,
} from "./content";

/**
 * Progreso del módulo de habilidades blandas, guardado por cuenta en el
 * navegador (mismo patrón que Comunidad / Tutor: caja propia por usuario).
 */

export type ChallengeState = { reflection: string; completed: boolean };

export type SoftSkillsProgress = {
  diagnosticAnswers: Record<string, number>;
  diagnosticCompletedAt: string | null;
  lessonsCompleted: string[];
  simulationsCompleted: string[];
  /** Reto por ruta, indexado por el id del reto. */
  challenges: Record<string, ChallengeState>;
};

export const EMPTY_PROGRESS: SoftSkillsProgress = {
  diagnosticAnswers: {},
  diagnosticCompletedAt: null,
  lessonsCompleted: [],
  simulationsCompleted: [],
  challenges: {},
};

let ownerId: string | null = null;

export function setSoftSkillsOwner(userId: string | null) {
  ownerId = userId;
}

export function softSkillsStorageKey(userId: string | null = ownerId): string {
  if (!userId) return "kampus.softskills.v1.anonymous";
  return `kampus.softskills.v1.${userId}`;
}

function resolveOwner(userId?: string | null): string | null {
  return userId === undefined ? ownerId : userId;
}

export function loadSoftSkillsProgress(userId?: string | null): SoftSkillsProgress {
  if (typeof window === "undefined") return { ...EMPTY_PROGRESS };
  try {
    const raw = window.localStorage.getItem(softSkillsStorageKey(resolveOwner(userId)));
    if (!raw) return { ...EMPTY_PROGRESS };
    const parsed = JSON.parse(raw) as Partial<SoftSkillsProgress> & {
      challengeReflection?: unknown;
      challengeCompleted?: unknown;
    };
    const challenges: Record<string, ChallengeState> = {};
    if (parsed.challenges && typeof parsed.challenges === "object") {
      for (const [key, value] of Object.entries(parsed.challenges)) {
        const v = value as Partial<ChallengeState> | null;
        if (v && typeof v === "object") {
          challenges[key] = {
            reflection: typeof v.reflection === "string" ? v.reflection : "",
            completed: v.completed === true,
          };
        }
      }
    }
    // Migración v1: el reto era único (Comunicación) y vivía en campos sueltos.
    if (!challenges[COMMUNICATION_CHALLENGE.id]) {
      const legacyReflection = typeof parsed.challengeReflection === "string" ? parsed.challengeReflection : "";
      const legacyCompleted = parsed.challengeCompleted === true;
      if (legacyReflection.length > 0 || legacyCompleted) {
        challenges[COMMUNICATION_CHALLENGE.id] = { reflection: legacyReflection, completed: legacyCompleted };
      }
    }
    return {
      diagnosticAnswers:
        parsed.diagnosticAnswers && typeof parsed.diagnosticAnswers === "object"
          ? Object.fromEntries(
              Object.entries(parsed.diagnosticAnswers).filter(
                (entry): entry is [string, number] => typeof entry[1] === "number",
              ),
            )
          : {},
      diagnosticCompletedAt: typeof parsed.diagnosticCompletedAt === "string" ? parsed.diagnosticCompletedAt : null,
      lessonsCompleted: Array.isArray(parsed.lessonsCompleted)
        ? parsed.lessonsCompleted.filter((x): x is string => typeof x === "string")
        : [],
      simulationsCompleted: Array.isArray(parsed.simulationsCompleted)
        ? parsed.simulationsCompleted.filter((x): x is string => typeof x === "string")
        : [],
      challenges,
    };
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

export function saveSoftSkillsProgress(progress: SoftSkillsProgress, userId?: string | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(softSkillsStorageKey(resolveOwner(userId)), JSON.stringify(progress));
}

/** Puntaje por dimensión: promedio de sus respuestas (1–5) en porcentaje 0–100. Null si falta alguna. */
export function dimensionScores(answers: Record<string, number>): Record<SoftSkillDimensionId, number | null> {
  const out = {} as Record<SoftSkillDimensionId, number | null>;
  for (const dim of SOFT_SKILL_DIMENSIONS) {
    const qs = DIAGNOSTIC_QUESTIONS.filter((q) => q.dimension === dim.id);
    const values = qs.map((q) => answers[q.id]);
    if (values.some((v) => typeof v !== "number")) {
      out[dim.id] = null;
    } else {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      out[dim.id] = Math.round((avg / 5) * 100);
    }
  }
  return out;
}

export function levelLabel(pct: number): string {
  if (pct < 40) return "Punto de partida";
  if (pct < 70) return "En desarrollo";
  return "Fortaleza";
}

/** Dimensión más débil con puntaje (para recomendar por dónde empezar). */
export function weakestDimension(answers: Record<string, number>): SoftSkillDimensionId | null {
  const scores = dimensionScores(answers);
  let best: SoftSkillDimensionId | null = null;
  let bestVal = Infinity;
  for (const dim of SOFT_SKILL_DIMENSIONS) {
    const v = scores[dim.id];
    if (v !== null && v < bestVal) {
      bestVal = v;
      best = dim.id;
    }
  }
  return best;
}

/**
 * Avance de una ruta: lecciones 60%, simulaciones 30%, reto 10%.
 * Referencia a content para que un id desconocido no infle el porcentaje.
 */
export function routeProgress(progress: SoftSkillsProgress, routeId: RouteId): number {
  const content = ROUTE_CONTENT[routeId];
  const lessonIds = new Set(content.lessons.map((l) => l.id));
  const simIds = new Set(content.simulations.map((s) => s.id));
  const lessons = progress.lessonsCompleted.filter((id) => lessonIds.has(id)).length;
  const sims = progress.simulationsCompleted.filter((id) => simIds.has(id)).length;
  const challenge = progress.challenges[content.challenge.id];
  const pct =
    (lessons / content.lessons.length) * 60 +
    (sims / content.simulations.length) * 30 +
    (challenge?.completed && challenge.reflection.trim().length > 0 ? 10 : 0);
  return Math.round(pct);
}

export function isRouteComplete(progress: SoftSkillsProgress, routeId: RouteId): boolean {
  return routeProgress(progress, routeId) >= 100;
}

export function communicationRouteProgress(progress: SoftSkillsProgress): number {
  return routeProgress(progress, "comunicacion");
}

export function isCommunicationRouteComplete(progress: SoftSkillsProgress): boolean {
  return isRouteComplete(progress, "comunicacion");
}
