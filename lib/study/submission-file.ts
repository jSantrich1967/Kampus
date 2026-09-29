/** A delivered report. Separate from the personal notebook bucket. */
export const SUBMISSION_BUCKET = "student-submissions";

export const SUBMISSION_MAX_BYTES = 20 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "png", "jpg", "jpeg", "webp"]);

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export type SubmissionFileProblem = "type" | "size";

export function submissionExtension(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

/** Rejects anything that is not a PDF, a Word file, or an image within the size cap. */
export function submissionFileProblem(file: { name: string; size: number }): SubmissionFileProblem | null {
  if (!ALLOWED_EXTENSIONS.has(submissionExtension(file.name))) return "type";
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > SUBMISSION_MAX_BYTES) return "size";
  return null;
}

export function submissionContentType(fileName: string): string {
  return MIME_BY_EXTENSION[submissionExtension(fileName)] ?? "application/octet-stream";
}

/** Path starts with the owner id so storage rules can check the folder. */
export function submissionObjectPath(userId: string, fileName: string, objectId: string): string {
  const ext = submissionExtension(fileName);
  const stem = (fileName.split(/[/\\]/).pop() ?? "trabajo")
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${userId}/${objectId}/${stem || "trabajo"}.${ext}`;
}
