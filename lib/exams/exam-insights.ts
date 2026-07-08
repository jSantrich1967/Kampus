import type { Exam } from "@/lib/schemas/exams";

/** Days from today (local midnight) until an ISO date, or null if invalid. */
export function daysUntilExam(isoDate?: string): number | null {
  if (!isoDate?.trim()) return null;
  const target = new Date(isoDate);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
