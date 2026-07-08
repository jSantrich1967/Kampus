import type { DiaryInsights } from "@/lib/wellbeing/diary-insights";

export type WellbeingRiskLevel = "ok" | "watch" | "elevated";

export type WellbeingRiskSignal = {
  level: WellbeingRiskLevel;
  /** 0–100 for progress bar on radar */
  score: number;
  reasons: string[];
  showOnRadar: boolean;
};

export function computeWellbeingRiskSignal(insights: DiaryInsights): WellbeingRiskSignal {
  const reasons: string[] = [];
  let points = 0;

  if (insights.lowMoodDays7d >= 3) {
    points += 45;
    reasons.push(`${insights.lowMoodDays7d} días con ánimo bajo en la última semana.`);
  } else if (insights.lowMoodDays7d >= 2) {
    points += 28;
    reasons.push("Varios días recientes con ánimo bajo en el diario.");
  }

  if (insights.stressTagCount7d >= 3) {
    points += 30;
    reasons.push(`Etiqueta "Estrés" en ${insights.stressTagCount7d} entradas esta semana.`);
  } else if (insights.stressTagCount7d >= 2) {
    points += 18;
    reasons.push("El estrés aparece repetido en tus check-ins recientes.");
  }

  if (insights.moodTrend === "down") {
    points += 20;
    reasons.push("La tendencia de ánimo de la semana va a la baja.");
  }

  if (insights.averageEnergy7d !== null && insights.averageEnergy7d <= 2.5) {
    points += 22;
    reasons.push(`Energía media baja (${insights.averageEnergy7d}/5) en los últimos 7 días.`);
  }

  if (insights.weekCompareEnergy === "worse") {
    points += 12;
    reasons.push("Esta semana reportas menos energía que la anterior.");
  }

  if (insights.entriesLast7Days === 0 && insights.entriesLast14Days > 0) {
    points += 8;
    reasons.push("Llevás una semana sin escribir — el silencio también es señal.");
  }

  const score = Math.min(100, points);
  let level: WellbeingRiskLevel = "ok";
  if (score >= 55) level = "elevated";
  else if (score >= 28) level = "watch";

  return {
    level,
    score,
    reasons: reasons.slice(0, 4),
    showOnRadar: level !== "ok" && insights.entriesLast14Days > 0,
  };
}
