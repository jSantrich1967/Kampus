export type NotebookDocumentRow = {
  id: string;
  user_id: string;
  subject: string;
  storage_path: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  extracted_text: string | null;
  created_at: string;
  updated_at: string;
};
