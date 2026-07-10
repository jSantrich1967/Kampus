"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Props = {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
  caption?: string;
};

export function ImageLightbox({ src, alt = "", open, onClose, caption }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Imagen ampliada"
      onClick={onClose}
    >
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="absolute right-4 top-4 z-10 gap-1.5"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X className="h-4 w-4" />
        Cerrar
      </Button>
      {caption ? (
        <p className="absolute left-4 top-4 z-10 max-w-[min(70vw,28rem)] text-sm text-white/70">{caption}</p>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={cn("max-h-[min(88vh,900px)] max-w-[min(96vw,1200px)] rounded-2xl object-contain shadow-2xl")}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
