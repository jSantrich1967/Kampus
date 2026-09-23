import type { SupabaseClient } from "@supabase/supabase-js";

export interface StudentAlert {
  studentId: string;
  studentName: string;
  lastActivityDay: string | null;
  weekDays: number;
  pendingWorks: number;
  avg30d: number | null;
  graded30d: number;
}

export type RiskLevel = "high" | "medium" | "ok";

export interface StudentAlertWithRisk extends StudentAlert {
  risk: RiskLevel;
  signals: string[];
  daysInactive: number | null;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T12:00:00`).getTime();
  const db = new Date(`${b}T12:00:00`).getTime();
  return Math.round((db - da) / 86400000);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Clasifica el riesgo y genera señales en lenguaje cotidiano. */
export function classifyAlert(a: StudentAlert): StudentAlertWithRisk {
  const signals: string[] = [];
  let risk: RiskLevel = "ok";
  const daysInactive = a.lastActivityDay ? daysBetween(a.lastActivityDay, todayIso()) : null;

  if (daysInactive == null) {
    signals.push("Sin actividad de estudio registrada todavía.");
    risk = "medium";
  } else if (daysInactive >= 7) {
    signals.push(`Sin estudiar hace ${daysInactive} días.`);
    risk = "high";
  } else if (daysInactive >= 3) {
    signals.push(`Solo ${a.weekDays} de 7 días con estudio esta semana.`);
    if (risk === "ok") risk = "medium";
  }

  if (a.pendingWorks >= 3) {
    signals.push(`${a.pendingWorks} trabajos pendientes de corrección.`);
    if (risk === "ok") risk = "medium";
  } else if (a.pendingWorks > 0) {
    signals.push(`${a.pendingWorks} ${a.pendingWorks === 1 ? "trabajo pendiente" : "trabajos pendientes"} de corrección.`);
  }

  if (a.avg30d != null && a.graded30d >= 2) {
    if (a.avg30d < 12) {
      signals.push(`Promedio bajo: ${a.avg30d}/20 en el último mes.`);
      risk = "high";
    } else if (a.avg30d < 14) {
      signals.push(`Promedio en zona de riesgo: ${a.avg30d}/20 en el último mes.`);
      if (risk === "ok") risk = "medium";
    }
  }

  if (signals.length === 0) {
    signals.push("Va bien: actividad constante y sin pendientes.");
  }

  return { ...a, risk, signals, daysInactive };
}

export async function getTeacherAlerts(client: SupabaseClient): Promise<StudentAlertWithRisk[]> {
  const { data, error } = await client.rpc("get_teacher_alerts");
  if (error) throw error;
  const row = data as { ok?: boolean; students?: Array<Record<string, unknown>> } | null;
  if (!row || !row.ok || !Array.isArray(row.students)) return [];
  const alerts: StudentAlert[] = row.students.map((s) => ({
    studentId: String(s.student_id ?? ""),
    studentName: String(s.student_name ?? "Estudiante"),
    lastActivityDay: s.last_activity_day ? String(s.last_activity_day) : null,
    weekDays: Number(s.week_days ?? 0),
    pendingWorks: Number(s.pending_works ?? 0),
    avg30d: s.avg_30d == null ? null : Number(s.avg_30d),
    graded30d: Number(s.graded_30d ?? 0),
  }));
  const order: Record<RiskLevel, number> = { high: 0, medium: 1, ok: 2 };
  return alerts.map(classifyAlert).sort((a, b) => order[a.risk] - order[b.risk]);
}
