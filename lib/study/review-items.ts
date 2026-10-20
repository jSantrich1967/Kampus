import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { gradeReview, type GradedReview, type ReviewState } from "@/lib/study/sm2";

export type DueReviewItem = {
  id: string;
  subject: string;
  topic: string;
  front: string;
  back: string;
};

export type PackCard = { front: string; back: string };

/** Límite de tarjetas por sesión de repaso. */
export const REVIEW_SESSION_LIMIT = 20;

/**
 * Hash de dedupe: la misma tarjeta del mismo tema no se registra dos veces.
 */
export function reviewContentHash(subject: string, topic: string, front: string): string {
  return createHash("sha256")
    .update([subject.trim().toLowerCase(), topic.trim().toLowerCase(), front.trim()].join("|"))
    .digest("hex")
    .slice(0, 32);
}

function toState(row: {
  easiness: unknown;
  interval_days: unknown;
  reps: unknown;
  lapses: unknown;
  successes?: unknown;
}): ReviewState {
  const reps = typeof row.reps === "number" ? row.reps : 0;
  return {
    easiness: typeof row.easiness === "number" ? row.easiness : 2.5,
    intervalDays: typeof row.interval_days === "number" ? row.interval_days : 0,
    reps,
    lapses: typeof row.lapses === "number" ? row.lapses : 0,
    successes: typeof row.successes === "number" ? row.successes : reps,
  };
}

/**
 * Tarjetas vencidas del usuario (next_due <= ahora), ordenadas por
 * vencimiento. Vacío si no hay, si no hay sesión o si la tabla
 * `review_items` aún no existe (la migración la aplica Joreg a mano).
 */
export async function getDueReviewItems(
  supabase: SupabaseClient,
  userId: string,
  limit: number = REVIEW_SESSION_LIMIT,
): Promise<DueReviewItem[]> {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from("review_items")
      .select("id, subject, topic, front, back")
      .eq("user_id", userId)
      .lte("next_due", new Date().toISOString())
      .order("next_due", { ascending: true })
      .limit(limit);
    if (error || !Array.isArray(data)) return [];
    return data.filter(
      (r): r is DueReviewItem =>
        typeof r?.id === "string" && typeof r?.front === "string" && typeof r?.back === "string",
    );
  } catch {
    return [];
  }
}

/**
 * Registra las tarjetas de un kit generado como items de repaso.
 * Dedupe por (user_id, content_hash): no duplica tarjetas ya registradas.
 * Devuelve la cantidad de tarjetas nuevas. Nunca lanza: si la tabla no
 * existe o algo falla, se omite en silencio (el kit ya se entregó).
 */
export async function registerPackReviewItems(
  supabase: SupabaseClient,
  userId: string,
  input: { subject: string; topic?: string; cards: PackCard[] },
): Promise<number> {
  const subject = input.subject.trim();
  const topic = (input.topic ?? subject).trim() || subject;
  if (!userId || !subject || input.cards.length === 0) return 0;
  try {
    const rows = input.cards
      .map((c) => {
        const front = c.front.trim().slice(0, 2000);
        const back = c.back.trim().slice(0, 4000);
        if (!front || !back) return null;
        return {
          user_id: userId,
          subject,
          topic,
          front,
          back,
          content_hash: reviewContentHash(subject, topic, front),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    if (rows.length === 0) return 0;
    const { error } = await supabase
      .from("review_items")
      .upsert(rows, { onConflict: "user_id,content_hash", ignoreDuplicates: true });
    if (error) return 0;
    return rows.length;
  } catch {
    return 0;
  }
}

/**
 * Estadísticas de repaso por (materia, tema) para el tablero de dominio:
 * solo tarjetas repasadas en los últimos `days` días. Vacío si no hay
 * o si la tabla aún no existe.
 */
export type ReviewTopicStat = {
  subject: string;
  topic: string;
  reps: number;
  lapses: number;
  successes: number;
};

export async function getRecentReviewTopicStats(
  supabase: SupabaseClient,
  userId: string,
  days: number = 30,
): Promise<ReviewTopicStat[]> {
  if (!userId) return [];
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("review_items")
      .select("subject, topic, reps, lapses, successes")
      .eq("user_id", userId)
      .not("last_reviewed_at", "is", null)
      .gte("last_reviewed_at", since)
      .limit(2000);
    if (error || !Array.isArray(data)) return [];
    return data
      .filter(
        (r): r is { subject: string; topic: string; reps: number; lapses: number; successes: number } =>
          typeof r?.subject === "string" && typeof r?.topic === "string",
      )
      .map((r) => ({
        subject: r.subject,
        topic: r.topic,
        reps: typeof r.reps === "number" ? r.reps : 0,
        lapses: typeof r.lapses === "number" ? r.lapses : 0,
        successes: typeof r.successes === "number" ? r.successes : typeof r.reps === "number" ? r.reps : 0,
      }));
  } catch {
    return [];
  }
}

/**
 * Califica una tarjeta con SM-2 y persiste el nuevo estado.
 * Matemática local, sin IA. Devuelve null si la tarjeta no existe,
 * no pertenece al usuario o la tabla aún no existe.
 */
export async function gradeReviewItem(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
  quality: number,
  gradeToken?: string,
): Promise<(GradedReview & { id: string }) | null> {
  if (!userId || !itemId) return null;
  try {
    const { data, error } = await supabase
      .from("review_items")
      .select("id, easiness, interval_days, reps, lapses, successes, next_due, last_grade_token")
      .eq("id", itemId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    const token = gradeToken?.trim() || "";
    if (token && data.last_grade_token === token && typeof data.next_due === "string") {
      const state = toState(data);
      return { id: itemId, ...state, nextDue: new Date(data.next_due) };
    }
    const graded = gradeReview(toState(data), quality);
    const { error: updateError } = await supabase
      .from("review_items")
      .update({
        easiness: graded.easiness,
        interval_days: graded.intervalDays,
        reps: graded.reps,
        lapses: graded.lapses,
        successes: graded.successes ?? graded.reps,
        next_due: graded.nextDue.toISOString(),
        last_reviewed_at: new Date().toISOString(),
        ...(token ? { last_grade_token: token } : {}),
      })
      .eq("id", itemId)
      .eq("user_id", userId);
    if (updateError) return null;
    return { id: itemId, ...graded };
  } catch {
    return null;
  }
}
