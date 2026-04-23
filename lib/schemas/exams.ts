import { z } from "zod";

export const examStatusSchema = z.enum(["draft", "open", "closed"]);
export type ExamStatus = z.infer<typeof examStatusSchema>;

export const attemptStatusSchema = z.enum(["submitted", "graded"]);
export type AttemptStatus = z.infer<typeof attemptStatusSchema>;

export const examQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  // For the demo we keep it open-ended. Later we can support MCQ / rubric rows.
});
export type ExamQuestion = z.infer<typeof examQuestionSchema>;

export const examSchema = z.object({
  id: z.string().min(1),
  subject: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(""),
  status: examStatusSchema.default("open"),
  dueDate: z.string().optional(), // ISO date
  questions: z.array(examQuestionSchema).min(1),
  createdAt: z.string().min(1),
});
export type Exam = z.infer<typeof examSchema>;

export const examFeedbackSchema = z.object({
  score: z.number().int().min(0).max(100),
  summary: z.string().min(1),
  strengths: z.array(z.string().min(1)).default([]),
  improvements: z.array(z.string().min(1)).default([]),
  createdAt: z.string().min(1),
});
export type ExamFeedback = z.infer<typeof examFeedbackSchema>;

export const examAttemptSchema = z.object({
  id: z.string().min(1),
  examId: z.string().min(1),
  studentLabel: z.string().min(1), // demo identity (no auth yet)
  answers: z.record(z.string(), z.string()),
  status: attemptStatusSchema,
  submittedAt: z.string().min(1),
  feedback: examFeedbackSchema.optional(),
});
export type ExamAttempt = z.infer<typeof examAttemptSchema>;

