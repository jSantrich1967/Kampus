import { localIsoDate } from "@/lib/calendar/local-iso-date";
import type { DiaryInsights } from "@/lib/wellbeing/diary-insights";
import type { WellbeingRiskLevel, WellbeingRiskSignal } from "@/lib/wellbeing/wellbeing-risk-bridge";

export type CounselorSharePayload = {
  studentLabel: string;
  university: string;
  weekOf: string;
  streakDays: number;
  insights: DiaryInsights;
  risk: WellbeingRiskSignal;
};

function riskLabelEs(level: WellbeingRiskLevel): string {
  if (level === "elevated") return "Priorizar cuidado";
  if (level === "watch") return "Vigilar";
  return "Estable";
}

function trendLabelEs(trend: DiaryInsights["moodTrend"]): string {
  if (trend === "up") return "Mejorando";
  if (trend === "down") return "A la baja";
  if (trend === "stable") return "Estable";
  return "Sin datos";
}

/** Privacy-safe summary for counselor — no diary body text. */
export function buildCounselorShareSummary(payload: CounselorSharePayload): string {
  const { studentLabel, university, weekOf, streakDays, insights, risk } = payload;
  const lines = [
    "Resumen de bienestar — Kampus (sin contenido del diario)",
    "────────────────────────────────────",
    `Estudiante: ${studentLabel || "Anónimo"}`,
    university ? `Centro: ${university}` : null,
    `Semana del: ${weekOf}`,
    "",
    "Check-in y hábitos",
    `• Racha diario: ${streakDays} día${streakDays === 1 ? "" : "s"}`,
    `• Entradas últimos 7 días: ${insights.entriesLast7Days}`,
    `• Entradas últimos 14 días: ${insights.entriesLast14Days}`,
    "",
    "Señales agregadas (autoinforme)",
    `• Energía media 7d: ${insights.averageEnergy7d ?? "—"}/5`,
    `• Tendencia de ánimo: ${trendLabelEs(insights.moodTrend)}`,
    `• Días con ánimo bajo (7d): ${insights.lowMoodDays7d}`,
    `• Entradas con etiqueta estrés (7d): ${insights.stressTagCount7d}`,
    `• Señal combinada: ${riskLabelEs(risk.level)} (${risk.score}/100)`,
    risk.reasons.length ? `• Motivos: ${risk.reasons.join("; ")}` : null,
    "",
    "Nota: Este resumen no incluye reflexiones privadas. El estudiante lo comparte voluntariamente.",
    "Kampus — apoyo emocional con IA, no sustituye atención clínica.",
  ].filter(Boolean) as string[];

  return lines.join("\n");
}

export function buildCounselorMailto(summary: string, studentLabel: string): string {
  const subject = encodeURIComponent(`Resumen bienestar Kampus — ${studentLabel || "estudiante"}`);
  const body = encodeURIComponent(summary);
  return `mailto:?subject=${subject}&body=${body}`;
}
