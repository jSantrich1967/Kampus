import { z } from "zod";

export const presentationTutorLevelSchema = z.enum(["school", "university"]);

export const presentationTutorRubricItemSchema = z.object({
  category: z.string().min(1),
  score10: z.number().int().min(0).max(10),
  notes: z.string().min(1),
  evidenceQuotes: z.array(z.string()).max(4).default([]),
});

/** Respuesta del tutor virtual para un ensayo / exposición. */
export const presentationTutorFeedbackSchema = z.object({
  level: presentationTutorLevelSchema,
  /** Etiqueta legible, p. ej. "7/10" o "Muy bien encaminados" */
  overallScoreLabel: z.string().min(1),
  overallScore10: z.number().int().min(0).max(10),
  rubric: z.array(presentationTutorRubricItemSchema).min(3).max(10),
  strengths: z.array(z.string()).min(1).max(12),
  toImprove: z.array(z.string()).min(1).max(12),
  concreteTips: z.array(z.string()).min(1).max(12),
  closingEncouragement: z.string().min(1),
});

export type PresentationTutorFeedback = z.infer<typeof presentationTutorFeedbackSchema>;
