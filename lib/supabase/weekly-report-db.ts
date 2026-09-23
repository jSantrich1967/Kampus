import type { SupabaseClient } from "@supabase/supabase-js";

import { whatsappShareUrl } from "@/lib/supabase/certificates-db";

export interface WeeklyReport {
  studentName: string;
  weekStart: string;
  weekEnd: string;
  studyDays: number;
  streak: number;
  submitted: number;
  reviewed: number;
  avgGrade: number | null;
}

export async function getWeeklyReport(
  client: SupabaseClient,
  studentId: string,
): Promise<WeeklyReport> {
  const { data, error } = await client.rpc("get_weekly_report", { p_student_id: studentId });
  if (error) throw error;
  const row = data as { ok?: boolean; error?: string } & Record<string, unknown>;
  if (!row || !row.ok) throw new Error(row?.error === "forbidden" ? "No tienes acceso a este reporte." : "No se pudo generar el reporte.");
  return {
    studentName: String(row.student_name ?? "Estudiante"),
    weekStart: String(row.week_start ?? ""),
    weekEnd: String(row.week_end ?? ""),
    studyDays: Number(row.study_days ?? 0),
    streak: Number(row.streak ?? 0),
    submitted: Number(row.submitted ?? 0),
    reviewed: Number(row.reviewed ?? 0),
    avgGrade: row.avg_grade == null ? null : Number(row.avg_grade),
  };
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("es-VE", { day: "numeric", month: "short" });
}

/** Texto del reporte semanal, listo para enviar por WhatsApp al representante. */
export function weeklyReportText(r: WeeklyReport): string {
  const lines = [
    `📚 Reporte semanal de Kampus`,
    `${r.studentName} · ${fmtDate(r.weekStart)} al ${fmtDate(r.weekEnd)}`,
    ``,
    `🔥 Racha de estudio: ${r.streak} ${r.streak === 1 ? "día" : "días"}`,
    `📅 Días que estudió esta semana: ${r.studyDays}/7`,
    `📝 Trabajos enviados: ${r.submitted}`,
    `✅ Trabajos corregidos: ${r.reviewed}`,
  ];
  if (r.avgGrade != null) lines.push(`⭐ Promedio de la semana: ${r.avgGrade}/20`);
  if (r.studyDays === 0 && r.submitted === 0) {
    lines.push(``, `⚠️ Sin actividad registrada esta semana. ¡Anímalo a retomar!`);
  } else if (r.streak >= 5) {
    lines.push(``, `🎉 ¡Excelente semana! Sigue así.`);
  }
  return lines.join("\n");
}

export function weeklyReportWhatsappUrl(r: WeeklyReport): string {
  return whatsappShareUrl(weeklyReportText(r));
}
