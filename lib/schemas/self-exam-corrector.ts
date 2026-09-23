import { z } from "zod";

/** Petición del estudiante para analizar su propio examen resuelto. */
export const selfCorrectionRequestSchema = z.object({
  subject: z.string().trim().max(120).default(""),
  examTitle: z.string().trim().max(200).default(""),
  totalPoints: z.number().min(1).max(1000).default(20),
  /** Clave oficial OPCIONAL. Si viene, debe tener al menos 10 caracteres. */
  answerKey: z
    .string()
    .trim()
    .max(12000)
    .default("")
    .refine((v) => v.length === 0 || v.length >= 10, {
      message: "Si pegas la clave oficial, debe tener al menos 10 caracteres.",
    }),
  /** Respuestas del estudiante en texto (una alternativa a studentImage). */
  studentAnswers: z.string().trim().max(12000).default(""),
  /** Foto del examen del estudiante como data URL (image/*). */
  studentImage: z.string().trim().max(6_000_000).default(""),
});

export type SelfCorrectionRequest = z.infer<typeof selfCorrectionRequestSchema>;

export const selfCorrectionErrorSchema = z.object({
  question: z.string().min(1),
  whatWentWrong: z.string().min(1),
  correctApproach: z.string().min(1),
  topic: z.string().min(1),
});

export const flashcardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
});

export const miniQuizItemSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
});

export const recoveryPlanSchema = z.object({
  day1: z.array(z.string().min(1)).min(1).max(6),
  day2: z.array(z.string().min(1)).min(1).max(6),
});

/** Resultado del análisis de errores con IA. La nota es estimada y secundaria. */
export const selfCorrectionSchema = z.object({
  /** Porcentaje estimado 0–100. Es una aproximación, no una nota oficial. */
  percentage: z.number().min(0).max(100),
  /** Etiqueta legible, p. ej. "13/20 aprox. — vas bien, con temas por reforzar". */
  estimatedLabel: z.string().min(1),
  errorsByQuestion: z.array(selfCorrectionErrorSchema).min(1).max(30),
  /** Temas débiles detectados, entre 1 y 6. */
  weakTopics: z.array(z.string().min(1)).min(1).max(6),
  /** Acciones concretas de estudio para los próximos dos días. */
  recoveryPlan: recoveryPlanSchema,
  /** 6–10 tarjetas sobre los temas débiles. */
  flashcards: z.array(flashcardSchema).min(6).max(10),
  /** 4–6 preguntas de autoevaluación sobre los temas débiles. */
  miniQuiz: z.array(miniQuizItemSchema).min(4).max(6),
  /** Mensaje de cierre que anima, sin presión por la nota. */
  encouragingComment: z.string().min(1),
});

export type SelfCorrection = z.infer<typeof selfCorrectionSchema>;
