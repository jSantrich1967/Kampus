import { z } from "zod";

export const diagnoseQuestionSchema = z.object({
  topic: z.string().max(120),
  question: z.string().max(1200),
  options: z.array(z.string().max(400)).length(4),
  answerIndex: z.number().int().min(0).max(3),
});

export const diagnoseRequestSchema = z.object({
  subject: z.string().trim().min(2).max(120),
  topics: z.string().trim().max(600).default(""),
});

export const topicScoreSchema = z.object({
  topic: z.string().max(120),
  correct: z.number().int().min(0),
  total: z.number().int().min(1),
});

export const planRequestSchema = z.object({
  subject: z.string().trim().min(2).max(120),
  daysLeft: z.number().int().min(1).max(14),
  hoursPerDay: z.number().min(0.5).max(12),
  topics: z.string().trim().max(600).default(""),
  diagnostic: z.array(topicScoreSchema).min(1).max(20),
});

export const planBlockSchema = z.object({
  day: z.number().int().min(1),
  title: z.string().max(160),
  why: z.string().max(300),
  minutes: z.number().int().min(5).max(480),
  actions: z.array(z.string().max(200)).min(1).max(5),
  kind: z.enum(["study", "practice", "mock", "review"]),
});

export const planResultSchema = z.object({
  headline: z.string().max(280),
  blocks: z.array(planBlockSchema).min(1).max(24),
});

export type DiagnoseQuestion = z.infer<typeof diagnoseQuestionSchema>;
export type PlanBlock = z.infer<typeof planBlockSchema>;
