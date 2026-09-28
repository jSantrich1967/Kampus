import { z } from "zod";

/** Petición del docente para corregir un examen con IA. */
export const examCorrectionRequestSchema = z.object({
  studentName: z.string().trim().min(1).max(120),
  subject: z.string().trim().max(120).default(""),
  examTitle: z.string().trim().max(200).default(""),
  totalPoints: z.number().min(1).max(1000).default(20),
  answerKey: z.string().trim().min(10).max(12000),
  /** Respuestas del estudiante en texto (una alternativa a studentImage). */
  studentAnswers: z.string().trim().max(12000).default(""),
  /** Foto del examen del estudiante como data URL (image/*). */
  studentImage: z.string().trim().max(6_000_000).default(""),
});

export type ExamCorrectionRequest = z.infer<typeof examCorrectionRequestSchema>;

export const examCorrectionItemSchema = z.object({
  question: z.string().min(1),
  expected: z.string().min(1),
  studentAnswer: z.string().min(1),
  maxPoints: z.number().min(0),
  points: z.number().min(0),
  correct: z.boolean(),
  comment: z.string().min(1),
});

/** Resultado de la corrección con IA. */
export const examCorrectionSchema = z.object({
  studentName: z.string().min(1),
  totalEarned: z.number().min(0),
  totalPossible: z.number().min(0),
  percentage: z.number().min(0).max(100),
  /** Etiqueta legible, p. ej. "14/20 — bien, con errores de cálculo". */
  label: z.string().min(1),
  items: z.array(examCorrectionItemSchema).min(1).max(80),
  strengths: z.array(z.string()).min(1).max(8),
  toImprove: z.array(z.string()).min(1).max(8),
  generalComment: z.string().min(1),
});

export type ExamCorrection = z.infer<typeof examCorrectionSchema>;

function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}

/** The model may invent a total. The saved grade is the sum of the item points. */
export function reconcileExamCorrection(raw: unknown): ExamCorrection {
  const parsed = examCorrectionSchema.parse(raw);
  const items = parsed.items.map((item) => ({
    ...item,
    points: roundScore(Math.min(Math.max(item.points, 0), item.maxPoints)),
  }));
  const totalEarned = roundScore(items.reduce((sum, item) => sum + item.points, 0));
  const totalPossible = roundScore(items.reduce((sum, item) => sum + item.maxPoints, 0));
  const percentage =
    totalPossible <= 0 ? 0 : Math.min(100, roundScore((totalEarned / totalPossible) * 100));
  return { ...parsed, items, totalEarned, totalPossible, percentage };
}
