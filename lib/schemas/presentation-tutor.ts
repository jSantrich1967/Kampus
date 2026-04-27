import { z } from "zod";

/** Respuesta del tutor virtual para un ensayo / exposición. */
export const presentationTutorFeedbackSchema = z.object({
  /** Etiqueta legible, p. ej. "7/10" o "Muy bien encaminados" */
  overallScoreLabel: z.string().min(1),
  strengths: z.array(z.string()).min(1).max(12),
  toImprove: z.array(z.string()).min(1).max(12),
  concreteTips: z.array(z.string()).min(1).max(12),
  closingEncouragement: z.string().min(1),
});

export type PresentationTutorFeedback = z.infer<typeof presentationTutorFeedbackSchema>;
