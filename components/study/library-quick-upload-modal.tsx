"use client";

import { CheckCircle2, Loader2, Upload, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useFileDropZone } from "@/lib/hooks/use-file-drop-zone";
import { libraryCopy } from "@/lib/i18n/library";
import { formatNotebookCloudError } from "@/lib/notebooks/storage-errors";
import { uploadNotebookDocuments } from "@/lib/notebooks/upload-documents";
import {
  notebookKitHref,
  notebookReaderHref,
  type LibraryQuickUploadTarget,
} from "@/lib/study/library-quick-upload";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type LibraryQuickUploadModalProps = {
  target: LibraryQuickUploadTarget | null;
  onClose: () => void;
  onSuccess?: () => void;
};

export function LibraryQuickUploadModal({ target, onClose, onSuccess }: LibraryQuickUploadModalProps) {
  const { authUserId } = useKampus();
  const t = libraryCopy.es;
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);

  const resetState = useCallback(() => {
    setUploading(false);
    setError(null);
    setUploadedCount(0);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  useEffect(() => {
    resetState();
  }, [target, resetState]);

  async function handleFiles(fileList: FileList | null) {
    if (!target || !fileList?.length || !authUserId) return;
    if (!isSupabaseConfigured()) {
      setError("Supabase no está configurado.");
      return;
    }

    setUploading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();

    try {
      await uploadNotebookDocuments(supabase, {
        userId: authUserId,
        subject: target.subject.trim() || "General",
        files: Array.from(fileList),
        fields: {
          topic: target.topic?.trim() || "",
          lesson_point: target.lesson?.trim() || "",
          practice_exercises: "",
          schedule_id: target.scheduleId?.trim() || null,
          class_date: target.classDate?.trim() || null,
        },
      });
      setUploadedCount(fileList.length);
      onSuccess?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al subir.";
      setError(formatNotebookCloudError(msg));
    } finally {
      setUploading(false);
    }
  }

  const { isDraggingOver, resetDrag, dropZoneProps } = useFileDropZone({
    disabled: uploading || !authUserId,
    onDrop: (files) => void handleFiles(files),
  });

  useEffect(() => {
    resetDrag();
  }, [target, resetDrag]);

  if (!target) return null;

  const readerHref = notebookReaderHref(target.subject);
  const kitHref = notebookKitHref(target.subject);

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Cerrar"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#1b1b20] p-6 shadow-2xl">
        <button
          type="button"
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          aria-label="Cerrar"
          onClick={handleClose}
        >
          <X className="h-5 w-5" />
        </button>

        {uploadedCount > 0 ? (
          <div className="space-y-5 pt-2">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-400" aria-hidden />
              <div>
                <h3 className="text-xl font-bold text-white">{t.quickUploadSuccessTitle}</h3>
                <p className="mt-1 text-sm text-slate-300">
                  {t.quickUploadSuccessBody(uploadedCount, target.subject)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={readerHref}>
                <Button>{t.openReader}</Button>
              </Link>
              <Link href={kitHref}>
                <Button variant="secondary">{t.quickKit}</Button>
              </Link>
              <Button type="button" variant="ghost" onClick={handleClose}>
                {t.quickUploadClose}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="mb-1 pr-8 text-xl font-bold text-white">{t.quickUploadModalTitle}</h3>
            <p className="mb-1 text-sm font-medium text-purple-200">{target.subject}</p>
            {target.sessionLabel ? (
              <p className="mb-4 text-sm text-slate-400">{target.sessionLabel}</p>
            ) : (
              <p className="mb-4 text-sm text-slate-400">{t.quickUploadModalHint}</p>
            )}

            {target.classDate ? (
              <p className="mb-4 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
                {t.quickUploadLinkedHint}
              </p>
            ) : null}

            {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}

            {!authUserId ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-400">{t.demoReaderBody}</p>
                <Link href="/login">
                  <Button className="w-full">{t.quickUploadLoginCta}</Button>
                </Link>
              </div>
            ) : (
              <>
                <div
                  {...dropZoneProps}
                  role="button"
                  tabIndex={0}
                  aria-label={t.quickUploadDropLabel}
                  aria-busy={uploading}
                  className={cn(
                    "flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 transition",
                    uploading && "pointer-events-none opacity-60",
                    isDraggingOver
                      ? "border-purple-400 bg-purple-500/15 ring-2 ring-purple-400/40"
                      : "border-white/15 bg-white/5 hover:border-purple-500/40 hover:bg-white/[0.07]",
                  )}
                  onClick={() => !uploading && inputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      if (!uploading) inputRef.current?.click();
                    }
                  }}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mb-3 h-8 w-8 animate-spin text-purple-300" aria-hidden />
                      <span className="text-sm font-medium text-white">{t.quickUploadProgress}</span>
                    </>
                  ) : isDraggingOver ? (
                    <>
                      <Upload className="mb-3 h-8 w-8 text-purple-200" aria-hidden />
                      <span className="text-sm font-semibold text-white">{t.quickUploadDragActive}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="mb-3 h-8 w-8 text-purple-300" aria-hidden />
                      <span className="text-sm font-semibold text-white">{t.quickUploadDropLabel}</span>
                      <span className="mt-1 text-xs text-slate-400">{t.quickUploadDragHint}</span>
                      <span className="mt-2 text-xs text-slate-500">{t.quickUploadFormats}</span>
                    </>
                  )}
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,image/*,application/pdf"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => void handleFiles(e.target.files)}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
