import { z } from "zod";

/**
 * Petición del convertidor de material en cuaderno.
 * El material puede llegar como texto (pegado o extraído de un PDF)
 * o como foto (data URL) para lectura por visión. Al menos uno debe
 * tener contenido; el API rechaza si vienen ambos vacíos.
 */
export const materialConversionRequestSchema = z.object({
  subject: z.string().trim().min(1).max(120),
  materialText: z.string().default(""),
  materialImage: z.string().default(""),
  title: z.string().trim().max(160).optional(),
});

export type MaterialConversionRequest = z.infer<
  typeof materialConversionRequestSchema
>;

export const flashcardSchema = z.object({
  front: z.string().trim().min(1).max(300),
  back: z.string().trim().min(1).max(600),
});

export const quizQuestionSchema = z.object({
  question: z.string().trim().min(1).max(400),
  options: z.array(z.string().trim().min(1).max(200)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(1).max(600),
});

export const materialConversionSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(4000),
  keyPoints: z.array(z.string().trim().min(1).max(300)).min(4).max(10),
  flashcards: z.array(flashcardSchema).min(6).max(15),
  quiz: z.array(quizQuestionSchema).min(4).max(8),
});

export type MaterialConversion = z.infer<typeof materialConversionSchema>;
