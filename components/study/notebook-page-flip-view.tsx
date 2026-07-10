"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

const SLIDE_MS = 420;

type SlideAnim = {
  from: number;
  to: number;
  dir: "forward" | "backward";
};

type Props = {
  pageIndex: number;
  total: number;
  pageFilename?: string;
  onPageIndexChange: (index: number) => void;
  onFlipControlReady?: (flipTo: (target: number) => void) => void;
  renderPage: (index: number) => React.ReactNode;
  className?: string;
  hint?: string;
  pageLabel?: (current: number, total: number) => string;
};

export function NotebookPageFlipView({
  pageIndex,
  total,
  pageFilename,
  onPageIndexChange,
  onFlipControlReady,
  renderPage,
  className,
  hint = "Haz clic en los bordes, usa ← → en el teclado o desliza en móvil para hojear.",
  pageLabel = (current, max) => `Hoja ${current} de ${max}`,
}: Props) {
  const [slide, setSlide] = useState<SlideAnim | null>(null);
  const busyRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const flipTo = useCallback(
    (target: number) => {
      if (busyRef.current || slide || target < 0 || target >= total || target === pageIndex) return;

      if (reducedMotionRef.current) {
        onPageIndexChange(target);
        return;
      }

      busyRef.current = true;
      const dir = target > pageIndex ? "forward" : "backward";
      setSlide({ from: pageIndex, to: target, dir });
      window.setTimeout(() => {
        onPageIndexChange(target);
        setSlide(null);
        busyRef.current = false;
      }, SLIDE_MS);
    },
    [onPageIndexChange, pageIndex, slide, total],
  );

  useEffect(() => {
    onFlipControlReady?.(flipTo);
  }, [flipTo, onFlipControlReady]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        flipTo(pageIndex - 1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        flipTo(pageIndex + 1);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [flipTo, pageIndex]);

  const animating = Boolean(slide);
  const canPrev = pageIndex > 0 && !animating;
  const canNext = pageIndex < total - 1 && !animating;

  return (
    <div className={cn("notebook-page-flip relative", className)}>
      <div className="notebook-page-flip-stage relative overflow-hidden rounded-xl border border-amber-900/25 bg-gradient-to-br from-amber-50/[0.08] via-white/[0.03] to-amber-950/[0.12] shadow-[inset_0_0_48px_rgba(0,0,0,0.2)]">
        <div className="relative min-h-[300px]">
          {slide ? (
            <>
              <div className="absolute inset-0 z-0 bg-slate-950/40">{renderPage(slide.to)}</div>
              <div
                className={cn(
                  "absolute inset-0 z-10 bg-slate-950/80 shadow-[0_0_40px_rgba(0,0,0,0.45)]",
                  slide.dir === "forward" ? "notebook-slide-out-left" : "notebook-slide-out-right",
                )}
              >
                {renderPage(slide.from)}
              </div>
            </>
          ) : (
            renderPage(pageIndex)
          )}
        </div>

        <button
          type="button"
          className={cn(
            "absolute left-0 top-0 z-30 flex h-full w-[18%] min-w-[3rem] items-center justify-start bg-gradient-to-r from-black/35 to-transparent pl-2 transition",
            canPrev ? "cursor-pointer opacity-80 hover:opacity-100" : "cursor-not-allowed opacity-0",
          )}
          aria-label="Página anterior"
          disabled={!canPrev}
          onClick={() => flipTo(pageIndex - 1)}
        >
          <span className="rounded-full bg-black/55 p-2 text-white shadow-lg backdrop-blur-sm">
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </span>
        </button>
        <button
          type="button"
          className={cn(
            "absolute right-0 top-0 z-30 flex h-full w-[18%] min-w-[3rem] items-center justify-end bg-gradient-to-l from-black/35 to-transparent pr-2 transition",
            canNext ? "cursor-pointer opacity-80 hover:opacity-100" : "cursor-not-allowed opacity-0",
          )}
          aria-label="Página siguiente"
          disabled={!canNext}
          onClick={() => flipTo(pageIndex + 1)}
        >
          <span className="rounded-full bg-black/55 p-2 text-white shadow-lg backdrop-blur-sm">
            <ChevronRight className="h-5 w-5" aria-hidden />
          </span>
        </button>
      </div>

      <div
        className="mt-3 touch-pan-y"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start == null) return;
          const end = e.changedTouches[0]?.clientX ?? start;
          const dx = end - start;
          if (dx > 64) flipTo(pageIndex - 1);
          else if (dx < -64) flipTo(pageIndex + 1);
        }}
      >
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
          <button
            type="button"
            className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canPrev}
            onClick={() => flipTo(pageIndex - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          </button>
          <span className="font-medium text-slate-300">
            {pageLabel(pageIndex + 1, total)}
            {pageFilename ? (
              <span className="ml-1 font-normal text-slate-500">· {pageFilename}</span>
            ) : null}
          </span>
          <button
            type="button"
            className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canNext}
            onClick={() => flipTo(pageIndex + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
        <p className="mt-1 text-center text-[11px] text-slate-600">{hint}</p>
      </div>
    </div>
  );
}
