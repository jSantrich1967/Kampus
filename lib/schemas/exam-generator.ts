import { z } from "zod";

/** Petición del docente para generar un examen con IA. */
export const examGeneratorRequestSchema = z.object({
  subject: z.string().trim().min(2).max(120),
  topic: z.string().trim().min(3).max(500),
  questionCount: z.number().int().min(5).max(30).default(10),
  questionTypes: z.enum(["mixto", "opcion_multiple", "verdadero_falso", "desarrollo"]).default("mixto"),
  difficulty: z.enum(["facil", "medio", "dificil"]).default("medio"),
  totalPoints: z.number().min(1).max(100).default(20),
  /** Contexto opcional: temas vistos en clase, para afinar las preguntas. */
  context: z.string().trim().max(3000).default(""),
});

export type ExamGeneratorRequest = z.infer<typeof examGeneratorRequestSchema>;

export const generatedQuestionSchema = z.object({
  number: z.number().int().min(1),
  type: z.string().min(1),
  question: z.string().min(1),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
  points: z.number().min(0),
});

/** Examen generado por IA, con clave de respuestas incluida. */
export const generatedExamSchema = z.object({
  title: z.string().min(1),
  subject: z.string().min(1),
  topic: z.string().min(1),
  totalPoints: z.number().min(1),
  instructions: z.string().min(1),
  questions: z.array(generatedQuestionSchema).min(1),
});

export type GeneratedExam = z.infer<typeof generatedExamSchema>;
