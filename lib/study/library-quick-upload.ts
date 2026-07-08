import { subjectToPathSegment } from "@/lib/notebooks/paths";

export type LibraryQuickUploadTarget = {
  subject: string;
  scheduleId?: string | null;
  classDate?: string | null;
  topic?: string | null;
  lesson?: string | null;
  /** Shown in modal header when uploading for a specific class session. */
  sessionLabel?: string;
};

export function notebookReaderHref(subject: string): string {
  return `/study/notebook/${subjectToPathSegment(subject)}`;
}

export function notebookKitHref(subject: string): string {
  return `${notebookReaderHref(subject)}?kit=1`;
}

export function notebookReaderDocHref(subject: string, docId: string): string {
  return `${notebookReaderHref(subject)}?doc=${encodeURIComponent(docId)}`;
}
