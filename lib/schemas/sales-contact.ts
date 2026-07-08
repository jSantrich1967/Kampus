import { z } from "zod";

export const salesContactSchema = z.object({
  name: z.string().trim().min(2, "Indica tu nombre.").max(120),
  email: z.string().trim().email("Correo no válido.").max(254),
  institution: z.string().trim().min(2, "Indica tu institución.").max(200),
  students: z.enum(["1-500", "501-2000", "2001-10000", "10000+"]).optional(),
  message: z.string().trim().min(10, "Cuéntanos un poco más (mín. 10 caracteres).").max(2000),
});

export type SalesContactPayload = z.infer<typeof salesContactSchema>;

export const SALES_STUDENT_RANGES = [
  { value: "1-500", label: "1 – 500 estudiantes" },
  { value: "501-2000", label: "501 – 2.000 estudiantes" },
  { value: "2001-10000", label: "2.001 – 10.000 estudiantes" },
  { value: "10000+", label: "Más de 10.000 estudiantes" },
] as const;

export const KAMPUS_SALES_EMAIL =
  process.env.NEXT_PUBLIC_KAMPUS_SALES_EMAIL?.trim() || "ventas@kampus.app";
