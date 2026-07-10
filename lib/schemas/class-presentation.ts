import { z } from "zod";

export const classSlideDiagramSchema = z.object({
  type: z.enum(["flow", "compare", "list"]).default("list"),
  items: z
    .array(
      z.object({
        label: z.string().min(1),
        detail: z.string().optional(),
      }),
    )
    .min(1)
    .max(6),
});

export const classPresentationSlideSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  /** Conversational narration for text-to-speech (2–4 sentences). */
  narration: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(1).max(5),
  diagram: classSlideDiagramSchema.nullable().optional(),
  sourcePageNumber: z.number().int().min(1).optional(),
  sourceDocumentId: z.string().optional(),
  sourceFilename: z.string().optional(),
});

export const classPresentationSchema = z.object({
  subjectLine: z.string().min(1),
  intro: z.string().min(1),
  slides: z.array(classPresentationSlideSchema).min(3).max(12),
});

export type ClassPresentationSlide = z.infer<typeof classPresentationSlideSchema>;
export type ClassPresentation = z.infer<typeof classPresentationSchema>;
