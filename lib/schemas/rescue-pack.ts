import { z } from "zod";

export const rescueQuizItemSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  answerIndex: z.number().int().min(0),
  sourceClassLabel: z.string().min(1).optional(),
  sourceClassDate: z.string().nullable().optional(),
  sourceFilename: z.string().min(1).optional(),
  sourceDocumentId: z.string().min(1).optional(),
});

export const rescueFlashcardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
});

export const rescuePackSchema = z.object({
  subjectLine: z.string().min(1),
  quickSummary: z.string().min(1),
  fullSummary: z.string().min(1),
  deepExplanation: z.string().min(1),
  keyIdeas: z.array(z.string().min(1)).min(1),
  probableExamQuestions: z.array(z.string().min(1)).min(1),
  flashcards: z.array(rescueFlashcardSchema).min(1),
  quiz: z.array(rescueQuizItemSchema).min(1),
  studyChecklist: z.array(z.string().min(1)).min(1),
  mindMapOutline: z.string().min(1),
  easyExplanation: z.string().min(1),
  technicalExplanation: z.string().min(1),
  questionsForClass: z.array(z.string().min(1)).min(1),
  suggestedNextResource: z.string().min(1),
});

export type RescuePack = z.infer<typeof rescuePackSchema>;
