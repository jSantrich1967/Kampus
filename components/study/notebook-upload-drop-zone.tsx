"use client";

import { Loader2, Upload } from "lucide-react";
import { useRef } from "react";

import { cn } from "@/lib/cn";
import { libraryCopy } from "@/lib/i18n/library";
import { useFileDropZone } from "@/lib/hooks/use-file-drop-zone";

const FILE_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,application/pdf,image/*,text/plain,text/markdown";

type NotebookUploadDropZoneProps = {
  onFiles: (files: FileList) => void;
  uploading?: boolean;
  disabled?: boolean;
  variant?: "compact" | "large";
  label?: string;
  className?: string;
};

export function NotebookUploadDropZone({
  onFiles,
  uploading = false,
  disabled = false,
  variant = "large",
  label,
  className,
}: NotebookUploadDropZoneProps) {
  const t = libraryCopy.es;
  const inputRef = useRef<HTMLInputElement>(null);
  const isDisabled = disabled || uploading;

  const { isDraggingOver, dropZoneProps } = useFileDropZone({
    disabled: isDisabled,
    onDrop: onFiles,
  });

  const displayLabel =
    label ??
    (uploading ? t.quickUploadProgress : isDraggingOver ? t.quickUploadDragActive : t.quickUploadDropLabel);

  if (variant === "compact") {
    return (
      <div
        {...dropZoneProps}
        role="button"
        tabIndex={0}
        aria-label={displayLabel}
        aria-busy={uploading}
        className={cn(
          "inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ring-1 transition",
          isDraggingOver
            ? "bg-purple-500/25 text-white ring-purple-400/50"
            : "bg-indigo-500/20 text-indigo-100 ring-indigo-400/30 hover:bg-indigo-500/30",
          isDisabled && "pointer-events-none opacity-60",
          className,
        )}
        onClick={() => !isDisabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!isDisabled) inputRef.current?.click();
          }
        }}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
        {displayLabel}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept={FILE_ACCEPT}
          disabled={isDisabled}
          onChange={(e) => onFiles(e.target.files!)}
        />
      </div>
    );
  }

  return (
    <div
      {...dropZoneProps}
      role="button"
      tabIndex={0}
      aria-label={displayLabel}
      aria-busy={uploading}
      className={cn(
        "flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-8 transition",
        isDraggingOver
          ? "border-purple-400 bg-purple-500/15 ring-2 ring-purple-400/40"
          : "border-white/15 bg-indigo-500/10 hover:border-purple-500/40 hover:bg-indigo-500/15",
        isDisabled && "pointer-events-none opacity-60",
        className,
      )}
      onClick={() => !isDisabled && inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (!isDisabled) inputRef.current?.click();
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
          <span className="text-sm font-semibold text-indigo-100">{displayLabel}</span>
          <span className="mt-1 text-xs text-slate-400">{t.quickUploadDragHint}</span>
          <span className="mt-2 text-xs text-slate-500">{t.quickUploadFormats}</span>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept={FILE_ACCEPT}
        disabled={isDisabled}
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
    </div>
  );
}
