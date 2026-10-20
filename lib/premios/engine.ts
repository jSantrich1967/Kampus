import type { SupabaseClient } from "@supabase/supabase-js";

import { getLatestDiagnosesBySubject } from "@/lib/cram/diagnoses";
import { getRecentReviewTopicStats } from "@/lib/study/review-items";
import { computeTopicMastery } from "@/lib/study/topic-mastery";

/**
 * Motor de Premios: evalúa metas SOLO con datos que Kampus ya registra.
 * Nada se estima ni se inventa: cada métrica sale de su tabla real.
 */

export type PrizeMetric = "dias_estudio" | "racha" | "duelos" | "examenes" | "temas_dominados";
export type PrizeReward = "medalla" | "medalla_pro";
export type PrizeScope = "global" | "course";

export type Prize = {
  id: string;
  creatorId: string;
  scope: PrizeScope;
  courseId: string | null;
  title: string;
  description: string;
  metric: PrizeMetric;
  goal: number;
  minScore: number | null;
  reward: PrizeReward;
  proDays: number | null;
  active: boolean;
  createdAt: string;
};

export const METRIC_LABELS: Record<PrizeMetric, string> = {
  dias_estudio: "Días de estudio acumulados",
  racha: "Racha de estudio más larga (días seguidos)",
  duelos: "Duelos ganados",
  examenes: "Exámenes aprobados",
  temas_dominados: "Temas dominados (dominio ≥ 80%)",
};

export const DEFAULT_MIN_SCORE = 70;
export const MASTERY_GOAL_PCT = 80;

/** Racha más larga de días consecutivos. Entrada: fechas 'YYYY-MM-DD' (sin duplicados). Función pura. */
export function longestStreak(days: string[]): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let prevMs: number | null = null;
  for (const day of sorted) {
    const ms = Date.parse(`${day}T00:00:00Z`);
    if (!Number.isFinite(ms)) continue;
    run = prevMs !== null && ms - prevMs === 86_400_000 ? run + 1 : 1;
    if (run > best) best = run;
    prevMs = ms;
  }
  return best;
}

type DuelRow = {
  creator_id: string;
  challenger_id: string | null;
  creator_score: number | null;
  challenger_score: number | null;
  status: string;
};

/** Duelos ganados por el usuario entre duelos terminados. Función pura. */
export function countDuelWins(rows: DuelRow[], userId: string): number {
  let wins = 0;
  for (const r of rows) {
    if (r.status !== "done") continue;
    if (r.creator_score === null || r.challenger_score === null) continue;
    if (r.creator_id === userId && r.creator_score > r.challenger_score) wins += 1;
    else if (r.challenger_id === userId && r.challenger_score > r.creator_score) wins += 1;
  }
  return wins;
}

type AttemptRow = { exam_id: string; status: string; feedback: unknown };

/** Exámenes distintos aprobados: intentos calificados con score ≥ mínimo, contando un examen una sola vez. Función pura. */
export function countApprovedExams(rows: AttemptRow[], minScore: number): number {
  const passed = new Set<string>();
  for (const r of rows) {
    if (r.status !== "graded") continue;
    const fb = r.feedback as { score?: unknown } | null;
    const score = typeof fb?.score === "number" ? fb.score : null;
    if (score !== null && score >= minScore) passed.add(r.exam_id);
  }
  return passed.size;
}

/** Valor actual de la métrica para un estudiante, leído de las tablas reales. */
export async function computeMetricValue(
  admin: SupabaseClient,
  userId: string,
  metric: PrizeMetric,
  minScore: number | null,
): Promise<number> {
  switch (metric) {
    case "dias_estudio": {
      const { count } = await admin
        .from("study_days")
        .select("day", { count: "exact", head: true })
        .eq("user_id", userId);
      return count ?? 0;
    }
    case "racha": {
      const { data } = await admin.from("study_days").select("day").eq("user_id", userId);
      return longestStreak(((data ?? []) as { day: string }[]).map((r) => r.day));
    }
    case "duelos": {
      const { data } = await admin
        .from("duels")
        .select("creator_id, challenger_id, creator_score, challenger_score, status")
        .eq("status", "done")
        .or(`creator_id.eq.${userId},challenger_id.eq.${userId}`);
      return countDuelWins((data ?? []) as DuelRow[], userId);
    }
    case "examenes": {
      const { data } = await admin
        .from("user_exam_attempts")
        .select("exam_id, status, feedback")
        .eq("user_id", userId)
        .eq("status", "graded");
      return countApprovedExams((data ?? []) as AttemptRow[], minScore ?? DEFAULT_MIN_SCORE);
    }
    case "temas_dominados": {
      const [diagnoses, reviewStats] = await Promise.all([
        getLatestDiagnosesBySubject(admin, userId),
        getRecentReviewTopicStats(admin, userId, 30),
      ]);
      const subjects = computeTopicMastery(
        diagnoses.flatMap((d) => d.topics.map((t) => ({ subject: d.subject, topic: t.topic, correct: t.correct, total: t.total }))),
        reviewStats,
      );
      let count = 0;
      for (const s of subjects) for (const t of s.topics) if (t.pct !== null && t.pct >= MASTERY_GOAL_PCT) count += 1;
      return count;
    }
  }
}

/** Suma días Pro a billing_entitlements extendiendo desde el vencimiento vigente si aún es premium. */
export async function grantProDays(admin: SupabaseClient, userId: string, days: number): Promise<boolean> {
  const { data: current } = await admin
    .from("billing_entitlements")
    .select("plan, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  const now = Date.now();
  const currentExpiry =
    current?.plan === "premium" && typeof current?.expires_at === "string" ? Date.parse(current.expires_at) : NaN;
  const base = Number.isFinite(currentExpiry) && currentExpiry > now ? currentExpiry : now;
  const expiresAt = new Date(base + days * 86_400_000).toISOString();
  const { error } = await admin.from("billing_entitlements").upsert(
    { user_id: userId, plan: "premium", expires_at: expiresAt, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  return !error;
}

export function mapPrizeRow(row: Record<string, unknown>): Prize {
  return {
    id: String(row.id),
    creatorId: String(row.creator_id),
    scope: row.scope === "course" ? "course" : "global",
    courseId: typeof row.course_id === "string" ? row.course_id : null,
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    metric: (row.metric as PrizeMetric) ?? "dias_estudio",
    goal: typeof row.goal === "number" ? row.goal : 1,
    minScore: typeof row.min_score === "number" ? row.min_score : null,
    reward: row.reward === "medalla_pro" ? "medalla_pro" : "medalla",
    proDays: typeof row.pro_days === "number" ? row.pro_days : null,
    active: row.active !== false,
    createdAt: String(row.created_at ?? ""),
  };
}

export type PrizeProgress = {
  prize: Prize;
  value: number;
  awardedAt: string | null;
  proDaysGranted: number;
};

/**
 * Evalúa los premios visibles para el estudiante: calcula su avance y otorga
 * en el acto los que ya cumpla (idempotente por unique prize+user). Devuelve
 * el progreso y los premios recién ganados en esta evaluación.
 */
export async function evaluatePrizesForUser(
  admin: SupabaseClient,
  userId: string,
): Promise<{ items: PrizeProgress[]; newlyAwarded: PrizeProgress[] }> {
  const [prizesRes, enrollRes, awardsRes] = await Promise.all([
    admin.from("prizes").select("*").eq("active", true),
    admin.from("course_enrollments").select("course_id").eq("user_id", userId).eq("status", "active"),
    admin.from("prize_awards").select("prize_id, awarded_at, pro_days_granted").eq("user_id", userId),
  ]);
  if (prizesRes.error) throw new Error(prizesRes.error.message);

  const enrolledCourses = new Set(((enrollRes.data ?? []) as { course_id: string }[]).map((r) => r.course_id));
  const awardsByPrize = new Map(
    ((awardsRes.data ?? []) as { prize_id: string; awarded_at: string; pro_days_granted: number }[]).map((a) => [
      a.prize_id,
      a,
    ]),
  );

  const visible = ((prizesRes.data ?? []) as Record<string, unknown>[])
    .map(mapPrizeRow)
    .filter((p) => p.scope === "global" || (p.courseId !== null && enrolledCourses.has(p.courseId)));

  const items: PrizeProgress[] = [];
  const newlyAwarded: PrizeProgress[] = [];
  // Las métricas se calculan una sola vez por tipo, aunque haya varios premios con la misma.
  const metricCache = new Map<string, number>();

  for (const prize of visible) {
    const cacheKey = `${prize.metric}:${prize.metric === "examenes" ? (prize.minScore ?? DEFAULT_MIN_SCORE) : ""}`;
    let value = metricCache.get(cacheKey);
    if (value === undefined) {
      value = await computeMetricValue(admin, userId, prize.metric, prize.minScore);
      metricCache.set(cacheKey, value);
    }
    const existing = awardsByPrize.get(prize.id);
    if (existing) {
      items.push({ prize, value, awardedAt: existing.awarded_at, proDaysGranted: existing.pro_days_granted });
      continue;
    }
    if (value >= prize.goal) {
      let proDaysGranted = 0;
      if (prize.reward === "medalla_pro" && prize.proDays && prize.scope === "global") {
        const ok = await grantProDays(admin, userId, prize.proDays);
        proDaysGranted = ok ? prize.proDays : 0;
      }
      const { data: inserted, error } = await admin
        .from("prize_awards")
        .insert({ prize_id: prize.id, user_id: userId, pro_days_granted: proDaysGranted })
        .select("awarded_at")
        .single();
      if (!error && inserted) {
        const entry: PrizeProgress = {
          prize,
          value,
          awardedAt: (inserted as { awarded_at: string }).awarded_at,
          proDaysGranted,
        };
        items.push(entry);
        newlyAwarded.push(entry);
        continue;
      }
      // Si otro proceso lo otorgó primero (unique), se lee en la próxima carga.
    }
    items.push({ prize, value, awardedAt: null, proDaysGranted: 0 });
  }

  return { items, newlyAwarded };
}
