"use client";

import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mic,
  MicOff,
  Presentation,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ClassSlideDiagram } from "@/components/study/class-slide-diagram";
import { ClassSlideHeroArt } from "@/components/study/class-slide-hero-art";
import { ClassSlideIllustration } from "@/components/study/class-slide-illustration";
import { ClassSlideMermaid } from "@/components/study/class-slide-mermaid";
import { NotebookPageAnnotator } from "@/components/study/notebook-page-annotator";
import { Button } from "@/components/ui/button";
import { resolveSlideIcon } from "@/lib/class-presentation/slide-icons";
import { slideThemeFor } from "@/lib/class-presentation/slide-theme";
import { useClassPresentationNarration } from "@/lib/hooks/use-class-presentation-narration";
import { prefetchSlideIllustration } from "@/lib/hooks/use-slide-illustration";
import type { ClassPresentation } from "@/lib/schemas/class-presentation";
import { cn } from "@/lib/cn";

type Props = {
  presentation: ClassPresentation;
  mediaByDocId?: Record<string, string>;
  onClose: () => void;
};

export function ClassPresentationViewer({ presentation, mediaByDocId = {}, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [voiceOn, setVoiceOn] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const { speak, stop, prefetch, speaking, loading, voiceMode } = useClassPresentationNarration();
  const narratedIndexRef = useRef<number | null>(null);

  const total = presentation.slides.length;
  const slide = presentation.slides[index] ?? presentation.slides[0]!;
  const theme = slideThemeFor(slide.accent, index);
  const Icon = resolveSlideIcon(slide.visualIcon, index);
  const progress = ((index + 1) / total) * 100;

  const sourceUrl = slide.sourceDocumentId ? mediaByDocId[slide.sourceDocumentId] : undefined;
  const sourceIsPdf = Boolean(slide.sourceFilename?.toLowerCase().endsWith(".pdf"));

  const narrationText = slide.narration.trim();

  const goToSlide = useCallback(
    (next: number) => {
      stop();
      narratedIndexRef.current = null;
      setIndex(Math.max(0, Math.min(total - 1, next)));
    },
    [stop, total],
  );

  const playCurrentSlide = useCallback(() => {
    if (!voiceOn || !narrationText) return;
    narratedIndexRef.current = index;
    void speak(narrationText, {
      onEnd: () => {
        if (!autoAdvance) return;
        if (index < total - 1) goToSlide(index + 1);
      },
    });
    const nextSlide = presentation.slides[index + 1];
    if (nextSlide?.narration) void prefetch(nextSlide.narration.trim());
    if (nextSlide?.illustrationPrompt?.trim()) {
      void prefetchSlideIllustration(
        nextSlide.id,
        nextSlide.illustrationPrompt.trim(),
        presentation.subjectLine,
      );
    }
  }, [autoAdvance, goToSlide, index, narrationText, prefetch, presentation.slides, presentation.subjectLine, speak, total, voiceOn]);

  useEffect(() => {
    if (!voiceOn) {
      stop();
      narratedIndexRef.current = null;
      return;
    }
    if (narratedIndexRef.current === index) return;
    playCurrentSlide();
  }, [index, voiceOn, playCurrentSlide, stop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        stop();
        onClose();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goToSlide(index + 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToSlide(index - 1);
      }
      if (e.key === " ") {
        e.preventDefault();
        if (speaking || loading) stop();
        else playCurrentSlide();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goToSlide, index, loading, onClose, playCurrentSlide, speaking, stop]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      stop();
    };
  }, [stop]);

  const isLast = index >= total - 1;

  return (
    <div
      className={cn("fixed inset-0 z-[100] flex flex-col text-white", `bg-gradient-to-br ${theme.gradient}`)}
      role="dialog"
      aria-modal="true"
      aria-label="Clase visual"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute -right-16 bottom-20 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />
      </div>

      <div className="relative h-1 shrink-0 bg-black/30">
        <div className="h-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <header className="relative flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
            <Presentation className="h-3.5 w-3.5" />
            Clase visual
          </p>
          <h2 className="truncate text-base font-bold md:text-lg">{presentation.subjectLine}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden text-[10px] text-white/40 sm:inline">
            Voz {voiceMode === "openai" ? "HD" : voiceMode === "browser" ? "navegador" : "—"}
          </span>
          <Button
            type="button"
            size="sm"
            variant={voiceOn ? "secondary" : "ghost"}
            className="gap-1.5"
            onClick={() => setVoiceOn((v) => !v)}
          >
            {voiceOn ? <Volume2 className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            {voiceOn ? "Voz" : "Mudo"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-1.5"
            onClick={() => {
              if (speaking || loading) stop();
              else playCurrentSlide();
            }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
            {loading ? "Cargando…" : speaking ? "Parar" : "Escuchar"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setAutoAdvance((v) => !v)}>
            {autoAdvance ? "Auto ✓" : "Auto"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => { stop(); onClose(); }} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col xl:flex-row">
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-8">
          {index === 0 ? (
            <p className="class-presentation-enter mb-6 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">
              {presentation.intro}
            </p>
          ) : null}

          <article
            key={slide.id}
            className={cn(
              "class-presentation-enter mx-auto w-full max-w-3xl rounded-3xl border p-6 shadow-2xl backdrop-blur-xl md:p-8",
              theme.border,
              theme.glow,
              "bg-slate-950/55",
            )}
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className="flex flex-col gap-4">
                <ClassSlideHeroArt Icon={Icon} theme={theme} className="mx-auto lg:mx-0" />
                <ClassSlideIllustration
                  slideId={slide.id}
                  prompt={slide.illustrationPrompt}
                  subjectHint={presentation.subjectLine}
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-widest text-white/45">
                  Diapositiva {index + 1} / {total}
                  {slide.sourcePageNumber ? ` · Hoja ${slide.sourcePageNumber}` : ""}
                </p>
                <h3 className="mt-2 text-2xl font-bold leading-tight tracking-tight md:text-4xl">{slide.title}</h3>
                {slide.highlightQuote ? (
                  <blockquote className={cn("mt-4 border-l-4 border-white/25 pl-4 text-lg font-medium italic md:text-xl", theme.quoteText)}>
                    «{slide.highlightQuote}»
                  </blockquote>
                ) : null}
                <p className="mt-4 text-sm leading-relaxed text-slate-300 md:text-base">{slide.narration}</p>
              </div>
            </div>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {slide.bullets.map((b, i) => (
                <li
                  key={`${b}-${i}`}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm leading-relaxed text-slate-100",
                    theme.bulletBorder,
                  )}
                >
                  {b}
                </li>
              ))}
            </ul>

            {slide.mermaidCode?.trim() ? (
              <div className="mt-8 border-t border-white/10 pt-8">
                <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
                  Diagrama interactivo
                </p>
                <ClassSlideMermaid code={slide.mermaidCode} />
              </div>
            ) : null}

            {slide.diagram && slide.diagram.items.length > 0 ? (
              <div className="mt-8 border-t border-white/10 pt-8">
                <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
                  Mapa visual
                </p>
                <ClassSlideDiagram diagram={slide.diagram} theme={theme} />
              </div>
            ) : null}
          </article>

          {isLast && presentation.outro ? (
            <p className="class-presentation-enter mx-auto mt-6 max-w-2xl text-center text-sm text-white/60">{presentation.outro}</p>
          ) : null}
        </main>

        <aside className="relative flex w-full shrink-0 flex-col border-t border-white/10 bg-black/40 backdrop-blur-md xl:w-[min(38vw,440px)] xl:border-l xl:border-t-0">
          <div className="border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white/45">
            Tu apunte · {slide.sourceFilename ?? "sin archivo"}
          </div>
          <div className="flex flex-1 flex-col justify-center p-5">
            <div className="relative mx-auto w-full max-w-sm">
              <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-white/10 to-transparent blur-sm" />
              {sourceUrl && !sourceIsPdf && slide.sourceDocumentId ? (
                <NotebookPageAnnotator
                  documentId={slide.sourceDocumentId}
                  imageUrl={sourceUrl}
                  className="relative"
                />
              ) : sourceUrl ? (
                <div className="relative overflow-hidden rounded-xl border border-white/15 bg-slate-900 shadow-2xl ring-1 ring-white/10">
                  {sourceIsPdf ? (
                    <iframe
                      title={slide.sourceFilename ?? "Apunte PDF"}
                      src={sourceUrl}
                      className="h-[min(42vh,480px)] w-full bg-slate-900"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sourceUrl}
                      alt={slide.sourceFilename ?? "Apunte"}
                      className="max-h-[min(42vh,480px)] w-full object-contain"
                    />
                  )}
                </div>
              ) : (
                <div className="relative flex h-48 items-center justify-center rounded-xl border border-dashed border-white/15 px-6 text-center text-sm text-slate-500">
                  Abre el cuaderno para ver el apunte junto a la explicación.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <footer className="relative flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-black/30 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="flex gap-1.5">
          {presentation.slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goToSlide(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index ? "w-8 bg-white" : "w-2 bg-white/25 hover:bg-white/50",
              )}
              aria-label={`Diapositiva ${i + 1}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={index <= 0} onClick={() => goToSlide(index - 1)}>
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <Button type="button" size="sm" disabled={isLast} onClick={() => goToSlide(index + 1)}>
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
