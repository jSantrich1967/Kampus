import { daysUntilCalendarDate } from "@/lib/calendar/local-iso-date";
import type { Exam } from "@/lib/schemas/exams";

/** Days from today until an exam date. Date-only strings stay on that calendar day. */
export function daysUntilExam(isoDate?: string, now: Date = new Date()): number | null {
  if (!isoDate?.trim()) return null;
  return daysUntilCalendarDate(isoDate, now);
}

/** Parse "12–18 min" style hints from exam description. */
export function parseEstimatedMinutes(description: string): string | null {
  const range = description.match(/(\d+)\s*[–-]\s*(\d+)\s*min/i);
  if (range) return `${range[1]}–${range[2]} min`;
  const single = description.match(/(\d+)\s*min/i);
  if (single) return `${single[1]} min`;
  return null;
}

export function defaultEstimatedMinutes(questionCount: number): string {
  const low = Math.max(5, questionCount * 5);
  const high = questionCount * 10;
  return `${low}–${high} min`;
}

export type ExamListInsight = {
  exam: Exam;
  daysUntil: number | null;
  estimatedTime: string;
  urgencyScore: number;
};

export function buildExamListInsights(exams: Exam[]): ExamListInsight[] {
  return exams
    .map((exam) => {
      const daysUntil = daysUntilExam(exam.dueDate);
      let urgencyScore = 0;
      if (exam.status === "open") urgencyScore += 10;
      if (daysUntil !== null) {
        if (daysUntil < 0) urgencyScore -= 5;
        else if (daysUntil <= 3) urgencyScore += 40;
        else if (daysUntil <= 7) urgencyScore += 25;
        else if (daysUntil <= 14) urgencyScore += 10;
      }
      const estimatedTime =
        parseEstimatedMinutes(exam.description ?? "") ?? defaultEstimatedMinutes(exam.questions.length);
      return { exam, daysUntil, estimatedTime, urgencyScore };
    })
    .sort((a, b) => {
      if (b.urgencyScore !== a.urgencyScore) return b.urgencyScore - a.urgencyScore;
      return (a.daysUntil ?? 999) - (b.daysUntil ?? 999);
    });
}

export function pickNextExamInsight(insights: ExamListInsight[]): ExamListInsight | null {
  const open = insights.filter((i) => i.exam.status === "open");
  return open[0] ?? insights[0] ?? null;
}
