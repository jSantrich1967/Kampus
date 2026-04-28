export type NotebookDocumentRow = {
  id: string;
  user_id: string;
  subject: string;
  /** Tema del material (opcional; requiere migración SQL). */
  topic?: string;
  /** Punto / sub-bloque (opcional). */
  lesson_point?: string;
  /** Ejercicios prácticos o referencia (opcional). */
  practice_exercises?: string;
  /** Cuando el documento se sube desde el calendario, se enlaza a la clase del horario (opcional). */
  schedule_id?: string | null;
  /** Fecha YYYY-MM-DD de la clase (opcional). */
  class_date?: string | null;
  storage_path: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  extracted_text: string | null;
  created_at: string;
  updated_at: string;
};
