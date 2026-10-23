/**
 * Plan de repasos con repetición espaciada (piloto CopilotKit).
 *
 * Función pura y determinista: recibe los temas del cuaderno abierto (en
 * orden de aparición) y los reparte en rondas espaciadas. La genera la
 * acción frontal del piloto (`useCopilotAction`) y se presenta como
 * tarjeta en la UI, con enlace al flujo existente de /repasos.
 */

/** Días (desde hoy) de cada ronda de repaso: 1, 3, 7 y 14 (espaciado clásico). */
export const SPACED_REVIEW_DAYS = [1, 3, 7, 14] as const;

export type StudyPlanSession = {
  /** Número de ronda (1 = primer repaso). */
  round: number;
  /** Día sugerido contado desde hoy (1 = mañana). */
  dayOffset: number;
  /** Etiqueta lista para mostrar, p. ej. "Día 3". */
  dayLabel: string;
  /** Temas a repasar en esta sesión, en orden del cuaderno. */
  topics: string[];
  /** Qué hacer en la sesión, en español. */
  guidance: string;
};

export type StudyPlan = {
  notebookTitle: string;
  totalTopics: number;
  sessions: StudyPlanSession[];
};

const ROUND_GUIDANCE: Record<number, string> = {
  1: "Primer repaso: hojea cada tema y marca lo que no recuerdes sin mirar.",
  2: "Segundo repaso: intenta explicar cada tema en voz alta antes de revisar tus apuntes.",
  3: "Tercer repaso: hazte una mini-pregunta por tema y verifica la respuesta en la hoja.",
  4: "Repaso final: mezcla los temas y quédate solo con los que aún te cuesten.",
};

/**
 * Construye el plan. Temas duplicados o vacíos se descartan conservando
 * el orden de primera aparición. Sin temas, devuelve sesiones vacías.
 */
export function buildStudyPlan(notebookTitle: string, rawTopics: string[]): StudyPlan {
  const seen = new Set<string>();
  const topics: string[] = [];
  for (const raw of rawTopics) {
    const topic = raw.trim();
    if (!topic || seen.has(topic)) continue;
    seen.add(topic);
    topics.push(topic);
  }

  const title = notebookTitle.trim() || "Cuaderno";
  if (topics.length === 0) {
    return { notebookTitle: title, totalTopics: 0, sessions: [] };
  }

  const sessions = SPACED_REVIEW_DAYS.map((dayOffset, idx) => {
    const round = idx + 1;
    return {
      round,
      dayOffset,
      dayLabel: `Día ${dayOffset}`,
      topics: [...topics],
      guidance: ROUND_GUIDANCE[round] ?? "",
    };
  });

  return { notebookTitle: title, totalTopics: topics.length, sessions };
}

/** Resumen en texto plano del plan (resultado que la acción devuelve al modelo). */
export function summarizeStudyPlan(plan: StudyPlan): string {
  if (plan.totalTopics === 0) {
    return `El cuaderno «${plan.notebookTitle}» no tiene temas todavía: no se generó plan.`;
  }
  const lines = plan.sessions.map(
    (s) => `- ${s.dayLabel} (ronda ${s.round}): ${s.topics.join("; ")}`,
  );
  return [
    `Plan de repasos generado para «${plan.notebookTitle}» (${plan.totalTopics} temas, repetición espaciada):`,
    ...lines,
    "El plan ya se muestra como tarjeta en la pantalla; desde ahí puedes ir a /repasos.",
  ].join("\n");
}
