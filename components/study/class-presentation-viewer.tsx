"use client";

import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Mic,
  MicOff,
  Presentation,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ClassSlideDiagram } from "@/components/study/class-slide-diagram";
import { Button } from "@/components/ui/button";
import { useSpeechSynthesis } from "@/lib/hooks/use-speech-synthesis";
import type { ClassPresentation } from "@/lib/schemas/class-presentation";
import { cn } from "@/lib/cn";

type Props = {
  presentation: ClassPresentation;
  /** doc id → signed media URL for source page thumbnails */
  mediaByDocId?: Record<string, string>;
  onClose: () => void;
};

export function ClassPresentationViewer({ presentation, mediaByDocId = {}, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [voiceOn, setVoiceOn] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const { speak, cancel, speaking, supported } = useSpeechSynthesis();

  const total = presentation.slides.length;
  const slide = presentation.slides[index] ?? presentation.slides[0]!;
  const sourceUrl = slide.sourceDocumentId ? mediaByDocId[slide.sourceDocumentId] : undefined;
  const sourceIsPdf = Boolean(slide.sourceFilename?.toLowerCase().endsWith(".pdf"));

  const narrateSlide = useCallback(
    (slideIndex: number) => {
      if (!voiceOn || !supported) return;
      const s = presentation.slides[slideIndex];
      if (!s) return;
      const text = [s.title, s.narration, ...s.bullets].join(". ");
      speak(text, {
        onEnd: () => {
          if (!autoAdvance) return;
          if (slideIndex < presentation.slides.length - 1) {
            setIndex(slideIndex + 1);
          }
        },
      });
    },
    [autoAdvance, presentation.slides, speak, supported, voiceOn],
  );

  useEffect(() => {
    if (!voiceOn) {
      cancel();
      return;
    }
    narrateSlide(index);
    return () => cancel();
  }, [index, voiceOn]); // eslint-disable-line react-hooks/exhaustive-deps -- narrate on slide change only

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
        onClose();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setIndex((i) => Math.min(total - 1, i + 1));
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
      if (e.key === " ") {
        e.preventDefault();
        if (speaking) cancel();
        else narrateSlide(index);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancel, index, narrateSlide, onClose, speaking, total]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      cancel();
    };
  }, [cancel]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Clase visual"
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-6">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300/80">
            <Presentation className="h-4 w-4" />
            Clase visual
          </p>
          <h2 className="truncate text-lg font-bold md:text-xl">{presentation.subjectLine}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={voiceOn ? "secondary" : "ghost"}
            className="gap-1.5"
            onClick={() => setVoiceOn((v) => !v)}
            title={voiceOn ? "Silenciar voz" : "Activar voz"}
          >
            {voiceOn ? <Volume2 className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            {voiceOn ? "Voz on" : "Voz off"}
          </Button>
          {supported ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-1.5"
              onClick={() => {
                if (speaking) cancel();
                else narrateSlide(index);
              }}
            >
              <Mic className="h-4 w-4" />
              {speaking ? "Pausar" : "Escuchar"}
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="ghost" onClick={() => setAutoAdvance((v) => !v)}>
            {autoAdvance ? "Auto →" : "Manual"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              cancel();
              onClose();
            }}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-8">
          {index === 0 ? (
            <p className="mb-6 max-w-3xl text-base leading-relaxed text-slate-300 md:text-lg">{presentation.intro}</p>
          ) : null}

          <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
            <Maximize2 className="h-3.5 w-3.5" />
            Diapositiva {index + 1} de {total}
            {slide.sourcePageNumber ? (
              <span className="rounded bg-white/10 px-2 py-0.5">Hoja {slide.sourcePageNumber}</span>
            ) : null}
          </div>

          <h3 className="text-2xl font-bold tracking-tight text-white md:text-4xl">{slide.title}</h3>

          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-indigo-100/90 md:text-base">{slide.narration}</p>

          <ul className="mt-6 max-w-3xl space-y-2">
            {slide.bullets.map((b) => (
              <li key={b} className="flex gap-2 text-sm text-slate-200 md:text-base">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" aria-hidden />
                {b}
              </li>
            ))}
          </ul>

          {slide.diagram && slide.diagram.items.length > 0 ? (
            <div className="mt-8 max-w-xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Esquema visual</p>
              <ClassSlideDiagram diagram={slide.diagram} />
            </div>
          ) : null}
        </main>

        <aside className="flex w-full shrink-0 flex-col border-t border-white/10 bg-black/30 lg:w-[min(42vw,480px)] lg:border-l lg:border-t-0">
          <div className="border-b border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Apunte original
          </div>
          <div className="flex flex-1 items-center justify-center p-4">
            {sourceUrl ? (
              sourceIsPdf ? (
                <iframe
                  title={slide.sourceFilename ?? "Apunte PDF"}
                  src={sourceUrl}
                  className="h-[min(50vh,520px)] w-full rounded-xl border border-white/10 bg-slate-900"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
                <img
                  src={sourceUrl}
                  alt={slide.sourceFilename ?? "Apunte"}
                  className="max-h-[min(50vh,520px)] w-full rounded-xl border border-white/10 object-contain shadow-2xl"
                />
              )
            ) : (
              <div className="rounded-xl border border-dashed border-white/15 px-6 py-10 text-center text-sm text-slate-500">
                {slide.sourceFilename
                  ? `Vista del apunte «${slide.sourceFilename}» no disponible aquí. Ábrelo en el cuaderno.`
                  : "Sin imagen de apunte para esta diapositiva."}
              </div>
            )}
          </div>
        </aside>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 md:px-6">
        <div className="flex gap-1">
          {presentation.slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "h-2 w-2 rounded-full transition",
                i === index ? "w-6 bg-indigo-400" : "bg-white/20 hover:bg-white/40",
              )}
              aria-label={`Ir a diapositiva ${i + 1}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={index <= 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={index >= total - 1}
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
