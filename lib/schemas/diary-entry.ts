import { z } from "zod";

/** Escala de ánimo para el diario (sin etiquetas clínicas). */
export const diaryMoodSchema = z.enum(["heavy", "low", "neutral", "light", "bright"]);
export type DiaryMood = z.infer<typeof diaryMoodSchema>;

export const diaryMomentSchema = z.enum(["morning", "afternoon", "evening", "night"]);
export type DiaryMoment = z.infer<typeof diaryMomentSchema>;

export const diaryEntrySchema = z.object({
  id: z.string().min(1),
  /** Día “lógico” de la entrada (zona local), YYYY-MM-DD */
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  createdAt: z.string().min(1),
  mood: diaryMoodSchema,
  /** 1 = muy baja … 5 = muy alta */
  energy: z.number().int().min(1).max(5),
  moment: diaryMomentSchema.optional(),
  /** Hasta 3 líneas cortas de gratitud */
  gratitude: z.array(z.string().max(220)).max(3).default([]),
  /** Escritura libre principal */
  body: z.string().max(20000).default(""),
  /** Una frase hacia el futuro cercano */
  intention: z.string().max(500).default(""),
  tags: z.array(z.string().max(40)).max(12).default([]),
});

export type DiaryEntry = z.infer<typeof diaryEntrySchema>;

/** Campos guardados en JSONB en Supabase (sin id ni fechas de fila). */
export const diaryPayloadSchema = diaryEntrySchema.omit({
  id: true,
  entryDate: true,
  createdAt: true,
});
export type DiaryPayload = z.infer<typeof diaryPayloadSchema>;
