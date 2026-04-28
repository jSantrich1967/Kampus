import { z } from "zod";

export const classScheduleRowSchema = z.object({
  id: z.string().min(1),
  /** Monday=0 ... Sunday=6 */
  weekday: z.number().int().min(0).max(6),
  /** HH:MM */
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  /** HH:MM */
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  subject: z.string().min(1),
  location: z.string().default(""),
  professorName: z.string().default(""),
});

export type ClassScheduleRow = z.infer<typeof classScheduleRowSchema>;

export const classScheduleListSchema = z.array(classScheduleRowSchema);

