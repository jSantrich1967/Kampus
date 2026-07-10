"use client";

import { Loader2, RotateCcw, ZoomIn } from "lucide-react";
import { useState } from "react";

import { ImageLightbox } from "@/components/study/image-lightbox";
import { Button } from "@/components/ui/button";
import { useSlideIllustration } from "@/lib/hooks/use-slide-illustration";
import { cn } from "@/lib/cn";

type Props = {
  slideId: string;
  prompt?: string;
  subjectHint: string;
  slideTitle?: string;
  labels?: string[];
  className?: string;
};

export function ClassSlideIllustration({ slideId, prompt, subjectHint, slideTitle, labels, className }: Props) {
  const { dataUrl, loading, error, retry } = useSlideIllustration(slideId, prompt, subjectHint, slideTitle, labels);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!prompt?.trim()) return null;

  return (
    <>
      <div className={cn("relative overflow-hidden rounded-2xl border border-white/15 bg-black/30 shadow-xl", className)}>
      {loading ? (
        <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Ilustración IA…
          </div>
          <p className="text-xs text-slate-500">Suele tardar 10–20 s</p>
        </div>
      ) : null}
      {!loading && error ? (
        <div className="flex aspect-[16/10] flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-xs text-amber-200/90">{error}</p>
          <Button type="button" size="sm" variant="secondary" className="gap-1.5" onClick={retry}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reintentar
          </Button>
        </div>
      ) : null}
      {!loading && dataUrl ? (
        <button
          type="button"
          className="group relative block w-full cursor-zoom-in"
          onClick={() => setLightboxOpen(true)}
          aria-label="Ampliar ilustración"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="" className="aspect-[16/10] w-full object-cover transition group-hover:brightness-110" />
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white/90 opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
            <ZoomIn className="h-3.5 w-3.5" />
            Ampliar
          </span>
        </button>
      ) : null}
      </div>

      {dataUrl ? (
        <ImageLightbox
          src={dataUrl}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          caption="Diagrama anotado con etiquetas"
        />
      ) : null}
    </>
  );
}
