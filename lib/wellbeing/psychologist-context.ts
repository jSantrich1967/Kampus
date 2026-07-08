import type { DiaryInsights } from "@/lib/wellbeing/diary-insights";
import { formatInsightsSummaryForPsychologist } from "@/lib/wellbeing/diary-insights";
import type { DiaryEntry } from "@/lib/schemas/diary-entry";

export type PsychologistContextInput = {
  examSubject?: string;
  examDays?: number;
  insights?: DiaryInsights;
  entries?: DiaryEntry[];
};

export function buildPsychologistContextBlock(input: PsychologistContextInput): string {
  const parts: string[] = [];

  if (input.examSubject?.trim()) {
    const days =
      input.examDays === undefined
        ? "próximo"
        : input.examDays === 0
          ? "hoy"
          : input.examDays === 1
            ? "mañana"
            : `en ${input.examDays} días`;
    parts.push(
      `Contexto académico: el estudiante tiene un examen de "${input.examSubject.trim()}" ${days}. Prioriza estrategias de regulación emocional y estudio sin presión clínica.`,
    );
  }

  if (input.insights && input.entries) {
    const summary = formatInsightsSummaryForPsychologist(input.insights, input.entries);
    if (summary.trim()) {
      parts.push(`Resumen del diario privado del estudiante (no lo cites como diagnóstico): ${summary}`);
    }
  }

  return parts.join("\n\n");
}
