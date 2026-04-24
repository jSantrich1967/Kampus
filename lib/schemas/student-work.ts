import { z } from "zod";

/** Trabajo o investigación con fecha límite (calendario del estudiante). */
export const studentWorkSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subject: z.string().default("General"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().default(""),
  createdAt: z.string().min(1),
});
export type StudentWork = z.infer<typeof studentWorkSchema>;
