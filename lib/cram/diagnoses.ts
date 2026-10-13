import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { topicScoreSchema } from "@/lib/schemas/cram";

export type DiagnosisTopic = z.infer<typeof topicScoreSchema>;

export type SavedDiagnosis = {
  subject: string;
  topics: DiagnosisTopic[];
  correct: number;
  total: number;
  createdAt: string;
};

export type SubjectDiagnosis = {
  subject: string;
  topics: DiagnosisTopic[];
};

/**
 * Último diagnóstico guardado por materia (uno por materia, el más
 * reciente). Para el tablero de dominio por tema. Vacío si no hay o si
 * la tabla aún no existe.
 */
export async function getLatestDiagnosesBySubject(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubjectDiagnosis[]> {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from("cram_diagnoses")
      .select("subject, topics, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error || !Array.isArray(data)) return [];
    const bySubject = new Map<string, SubjectDiagnosis>();
    for (const row of data as Array<{ subject: unknown; topics: unknown }>) {
      const subject = typeof row.subject === "string" ? row.subject.trim() : "";
      if (!subject) continue;
      const key = subject.toLowerCase();
      if (bySubject.has(key)) continue; // ya tenemos el más reciente
      const parsed = z.array(topicScoreSchema).safeParse(row.topics);
      if (!parsed.success || parsed.data.length === 0) continue;
      bySubject.set(key, { subject, topics: parsed.data });
    }
    return [...bySubject.values()];
  } catch {
    return [];
  }
}

/**
 * Último diagnóstico guardado del usuario para la materia.
 * Devuelve null cuando no hay, cuando los datos no validan o cuando la
 * tabla `cram_diagnoses` aún no existe en producción (la migración la
 * aplica Joreg a mano): las rutas degradan y siguen como antes.
 */
export async function getLatestDiagnosis(
  supabase: SupabaseClient,
  userId: string,
  subject: string,
): Promise<SavedDiagnosis | null> {
  const s = subject.trim();
  if (!s || !userId) return null;
  try {
    const { data, error } = await supabase
      .from("cram_diagnoses")
      .select("subject, topics, correct, total, created_at")
      .eq("user_id", userId)
      .ilike("subject", s)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as {
      subject: unknown;
      topics: unknown;
      correct: unknown;
      total: unknown;
      created_at: unknown;
    };
    const parsed = z.array(topicScoreSchema).safeParse(row.topics);
    if (!parsed.success || parsed.data.length === 0) return null;
    return {
      subject: typeof row.subject === "string" ? row.subject : s,
      topics: parsed.data,
      correct: typeof row.correct === "number" ? row.correct : 0,
      total: typeof row.total === "number" ? row.total : 0,
      createdAt: typeof row.created_at === "string" ? row.created_at : "",
    };
  } catch {
    return null;
  }
}
