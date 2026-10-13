/**
 * Dominio por tema: de dónde sale el % que ve el estudiante.
 *
 * Fuentes (ninguna se inventa):
 * - Diagnóstico: último `cram_diagnoses` guardado por materia → por tema,
 *   correct/total (0..1).
 * - Repasos: `review_items` del usuario → por tema, proporción de
 *   repasos recordados = reps / (reps + lapses), considerando solo
 *   tarjetas repasadas en los últimos 30 días.
 *
 * Fórmula documentada:
 * - Si hay dato de ambas fuentes: 60% diagnóstico + 40% repasos.
 * - Si solo hay una: se usa esa.
 * - Si no hay ninguna: pct = null → la UI muestra "sin datos", NUNCA
 *   un porcentaje falso.
 */

export type DiagnosisTopicInput = {
  subject: string;
  topic: string;
  correct: number;
  total: number;
};

export type ReviewTopicInput = {
  subject: string;
  topic: string;
  /** Recuerdos correctos acumulados (SM-2). */
  reps: number;
  /** Olvidos acumulados (SM-2). */
  lapses: number;
};

export type TopicMastery = {
  topic: string;
  /** 0..100 redondeado, o null cuando no hay datos. */
  pct: number | null;
};

export type SubjectMastery = {
  subject: string;
  topics: TopicMastery[];
};

const DIAGNOSIS_WEIGHT = 0.6;
const REVIEW_WEIGHT = 0.4;

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function diagnosisScore(t: DiagnosisTopicInput): number | null {
  if (!Number.isFinite(t.correct) || !Number.isFinite(t.total) || t.total <= 0) return null;
  return Math.min(1, Math.max(0, t.correct / t.total));
}

function reviewScore(reps: number, lapses: number): number | null {
  const total = reps + lapses;
  if (!Number.isFinite(reps) || !Number.isFinite(lapses) || total <= 0) return null;
  return Math.min(1, Math.max(0, reps / total));
}

/**
 * Combina ambas fuentes por (materia, tema). Función pura: fácil de
 * probar y de auditar. No toca la BD.
 */
export function computeTopicMastery(
  diagnoses: DiagnosisTopicInput[],
  reviews: ReviewTopicInput[],
): SubjectMastery[] {
  type Acc = {
    subject: string;
    topic: string;
    d: number | null;
    reps: number;
    lapses: number;
  };
  const byKey = new Map<string, Acc>();

  for (const t of diagnoses) {
    if (!t.subject.trim() || !t.topic.trim()) continue;
    const key = `${norm(t.subject)}|${norm(t.topic)}`;
    const acc = byKey.get(key) ?? {
      subject: t.subject.trim(),
      topic: t.topic.trim(),
      d: null,
      reps: 0,
      lapses: 0,
    };
    acc.d = diagnosisScore(t);
    byKey.set(key, acc);
  }

  for (const r of reviews) {
    if (!r.subject.trim() || !r.topic.trim()) continue;
    const key = `${norm(r.subject)}|${norm(r.topic)}`;
    const acc = byKey.get(key) ?? {
      subject: r.subject.trim(),
      topic: r.topic.trim(),
      d: null,
      reps: 0,
      lapses: 0,
    };
    acc.reps += Math.max(0, Math.floor(r.reps));
    acc.lapses += Math.max(0, Math.floor(r.lapses));
    byKey.set(key, acc);
  }

  const subjects = new Map<string, SubjectMastery>();
  for (const acc of byKey.values()) {
    const r = reviewScore(acc.reps, acc.lapses);
    let pct: number | null = null;
    if (acc.d !== null && r !== null) pct = Math.round((DIAGNOSIS_WEIGHT * acc.d + REVIEW_WEIGHT * r) * 100);
    else if (acc.d !== null) pct = Math.round(acc.d * 100);
    else if (r !== null) pct = Math.round(r * 100);

    const sKey = norm(acc.subject);
    let subj = subjects.get(sKey);
    if (!subj) {
      subj = { subject: acc.subject, topics: [] };
      subjects.set(sKey, subj);
    }
    subj.topics.push({ topic: acc.topic, pct });
  }

  return [...subjects.values()].map((s) => ({
    ...s,
    topics: s.topics.sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1)),
  }));
}
