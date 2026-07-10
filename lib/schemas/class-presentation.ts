import { z } from "zod";

export const slideAccentSchema = z.enum(["violet", "cyan", "amber", "rose", "emerald"]);

export const slideVisualIconSchema = z.enum([
  "lightbulb",
  "book-open",
  "chart-line",
  "brain",
  "calculator",
  "layers",
  "target",
  "sparkles",
  "flask-conical",
  "globe",
  "scale",
  "code",
  "atom",
]);

export const classSlideDiagramSchema = z.object({
  type: z.enum(["flow", "compare", "list", "cycle", "concept"]).default("list"),
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
  /** Spoken script — natural, 2–3 sentences max (for TTS). */
  narration: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(2).max(5),
  /** Key phrase shown large on the slide. */
  highlightQuote: z.string().optional(),
  visualIcon: slideVisualIconSchema.optional(),
  accent: slideAccentSchema.optional(),
  diagram: classSlideDiagramSchema.nullable().optional(),
  /** Short scene description for AI illustration (no text in image). */
  illustrationPrompt: z.string().max(500).optional(),
  /** Optional Mermaid diagram source (flowchart, mindmap, timeline). */
  mermaidCode: z.string().max(2000).optional(),
  sourcePageNumber: z.number().int().min(1).optional(),
  sourceDocumentId: z.string().optional(),
  sourceFilename: z.string().optional(),
});

export const classPresentationSchema = z.object({
  subjectLine: z.string().min(1),
  intro: z.string().min(1),
  outro: z.string().optional(),
  slides: z.array(classPresentationSlideSchema).min(4).max(12),
});

export type SlideAccent = z.infer<typeof slideAccentSchema>;
export type SlideVisualIcon = z.infer<typeof slideVisualIconSchema>;
export type ClassPresentationSlide = z.infer<typeof classPresentationSlideSchema>;
export type ClassPresentation = z.infer<typeof classPresentationSchema>;
