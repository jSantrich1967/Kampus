import { z } from "zod";

export const gradeQuestionSchema = z.object({
  question: z.string().trim().min(3).max(2000),
  maxPoints: z.number().min(0.5).max(100),
  answerKey: z.string().trim().max(4000).default(""),
});

export const autoGraderRequestSchema = z.object({
  subject: z.string().trim().min(2).max(120),
  examTitle: z.string().trim().max(160).default(""),
  studentName: z.string().trim().min(1).max(80),
  questions: z.array(gradeQuestionSchema).min(1).max(30),
  answers: z.array(z.string().max(6000)).max(30).default([]),
  answerImage: z
    .string()
    .trim()
    .max(4_500_000)
    .refine((v) => v === "" || /^data:image\/(png|jpe?g|webp|gif);base64,/.test(v), {
      message: "Imagen no válida.",
    })
    .default(""),
});

export const gradedQuestionSchema = z.object({
  score: z.number().min(0),
  feedback: z.string().max(800),
});

export const autoGraderResultSchema = z.object({
  perQuestion: z.array(gradedQuestionSchema),
  totalScore: z.number().min(0),
  overallFeedback: z.string().max(1200),
});

export type AutoGraderRequest = z.infer<typeof autoGraderRequestSchema>;
export type AutoGraderResult = z.infer<typeof autoGraderResultSchema>;
