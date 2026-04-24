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
  storage_path: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  extracted_text: string | null;
  created_at: string;
  updated_at: string;
};
