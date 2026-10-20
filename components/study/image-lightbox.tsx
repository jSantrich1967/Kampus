"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useDialogFocus } from "@/hooks/use-dialog-focus";

type Props = {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
  caption?: string;
};

export function ImageLightbox({ src, alt = "", open, onClose, caption }: Props) {
  const dialogRef = useDialogFocus(open, onClose);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Imagen ampliada"
      onClick={onClose}
    >
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="absolute right-3 top-3 z-10 gap-1.5 sm:right-6 sm:top-6"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X className="h-4 w-4" />
        Cerrar
      </Button>
      {caption ? (
        <p className="absolute left-3 top-3 z-10 max-w-[min(70vw,28rem)] text-sm text-white/70 sm:left-6 sm:top-6">
          {caption}
        </p>
      ) : null}
      <div
        className="max-h-[92vh] max-w-[min(98vw,1400px)] overflow-auto rounded-2xl bg-white p-2 shadow-2xl sm:p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={cn("block h-auto w-full max-w-full object-contain")}
          style={{ maxHeight: "calc(92vh - 2rem)" }}
        />
      </div>
    </div>
  );
}
