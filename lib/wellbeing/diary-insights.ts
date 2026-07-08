import { addDaysLocalIso, localIsoDate } from "@/lib/calendar/local-iso-date";
import type { DiaryEntry, DiaryMood } from "@/lib/schemas/diary-entry";

const MOOD_SCORE: Record<DiaryMood, number> = {
  heavy: 1,
  low: 2,
  neutral: 3,
  light: 4,
  bright: 5,
};

export type DiaryInsights = {
  entriesLast7Days: number;
  entriesLast14Days: number;
  averageEnergy7d: number | null;
  averageEnergy14d: number | null;
  averageMoodScore7d: number | null;
  moodTrend: "up" | "down" | "stable" | null;
  stressTagCount7d: number;
  lowMoodDays7d: number;
  weekCompareEnergy: "better" | "worse" | "same" | null;
  todayMood: DiaryMood | null;
  todayEnergy: number | null;
};

function entriesInLastDays(entries: DiaryEntry[], days: number): DiaryEntry[] {
  const end = localIsoDate();
  const start = addDaysLocalIso(-(days - 1));
  return entries.filter((e) => e.entryDate >= start && e.entryDate <= end);
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export function computeDiaryInsights(entries: DiaryEntry[]): DiaryInsights {
  const today = localIsoDate();
  const last7 = entriesInLastDays(entries, 7);
  const last14 = entriesInLastDays(entries, 14);
  const todayEntry = entries.find((e) => e.entryDate === today);

  const energies = last7.map((e) => e.energy);
  const energies14 = last14.map((e) => e.energy);
  const moodScores = last7.map((e) => MOOD_SCORE[e.mood]);
  const stressTagCount7d = last7.filter((e) =>
    e.tags.some((t) => t.toLowerCase().includes("estrés") || t.toLowerCase().includes("estres")),
  ).length;
  const lowMoodDays7d = last7.filter((e) => e.mood === "heavy" || e.mood === "low").length;

  let moodTrend: DiaryInsights["moodTrend"] = null;
  if (last7.length >= 3) {
    const sorted = [...last7].sort((a, b) => a.entryDate.localeCompare(b.entryDate));
    const mid = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);
    const avgFirst = average(firstHalf.map((e) => MOOD_SCORE[e.mood])) ?? 0;
    const avgSecond = average(secondHalf.map((e) => MOOD_SCORE[e.mood])) ?? 0;
    const delta = avgSecond - avgFirst;
    if (delta >= 0.4) moodTrend = "up";
    else if (delta <= -0.4) moodTrend = "down";
    else moodTrend = "stable";
  }

  const week1Start = addDaysLocalIso(-6);
  const week2End = addDaysLocalIso(-7);
  const week2Start = addDaysLocalIso(-13);
  const week1 = last14.filter((e) => e.entryDate >= week1Start);
  const week2 = last14.filter((e) => e.entryDate >= week2Start && e.entryDate <= week2End);
  const avgW1 = average(week1.map((e) => e.energy));
  const avgW2 = average(week2.map((e) => e.energy));
  let weekCompareEnergy: DiaryInsights["weekCompareEnergy"] = null;
  if (avgW1 !== null && avgW2 !== null) {
    const delta = avgW1 - avgW2;
    if (delta >= 0.3) weekCompareEnergy = "better";
    else if (delta <= -0.3) weekCompareEnergy = "worse";
    else weekCompareEnergy = "same";
  }

  return {
    entriesLast7Days: last7.length,
    entriesLast14Days: last14.length,
    averageEnergy7d: average(energies),
    averageEnergy14d: average(energies14),
    averageMoodScore7d: average(moodScores),
    moodTrend,
    stressTagCount7d,
    lowMoodDays7d,
    weekCompareEnergy,
    todayMood: todayEntry?.mood ?? null,
    todayEnergy: todayEntry?.energy ?? null,
  };
}

export function moodEmoji(mood: DiaryMood): string {
  const map: Record<DiaryMood, string> = {
    heavy: "🌧️",
    low: "☁️",
    neutral: "⛅",
    light: "🌤️",
    bright: "☀️",
  };
  return map[mood];
}

export function formatInsightsSummaryForPsychologist(insights: DiaryInsights, entries: DiaryEntry[]): string {
  const last3 = entriesInLastDays(entries, 7)
    .sort((a, b) => b.entryDate.localeCompare(a.entryDate))
    .slice(0, 3);
  const lines = [
    `Entradas últimos 7 días: ${insights.entriesLast7Days}.`,
    insights.averageEnergy7d !== null ? `Energía media (7d): ${insights.averageEnergy7d}/5.` : null,
    insights.lowMoodDays7d > 0 ? `Días con ánimo bajo (7d): ${insights.lowMoodDays7d}.` : null,
    insights.stressTagCount7d > 0 ? `Etiqueta "Estrés" en ${insights.stressTagCount7d} entrada(s) reciente(s).` : null,
    insights.todayMood ? `Hoy: ánimo ${insights.todayMood}, energía ${insights.todayEnergy ?? "?"}/5.` : null,
    last3.length
      ? `Últimas fechas: ${last3.map((e) => `${e.entryDate} (${e.mood}, energía ${e.energy})`).join("; ")}.`
      : null,
  ].filter(Boolean);
  return lines.join(" ");
}
