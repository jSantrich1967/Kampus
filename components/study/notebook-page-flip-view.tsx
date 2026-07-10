"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

const FLIP_MS = 580;

type Props = {
  pageIndex: number;
  total: number;
  pageFilename?: string;
  onPageIndexChange: (index: number) => void;
  onFlipControlReady?: (flipTo: (target: number) => void) => void;
  children: ReactNode;
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
  children,
  className,
  hint = "Haz clic en los bordes, usa ← → en el teclado o desliza en móvil para hojear.",
  pageLabel = (current, max) => `Hoja ${current} de ${max}`,
}: Props) {
  const [flipClass, setFlipClass] = useState<"" | "notebook-flip-forward" | "notebook-flip-back">("");
  const busyRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const flipTo = useCallback(
    (target: number) => {
      if (busyRef.current || target < 0 || target >= total || target === pageIndex) return;

      if (reducedMotionRef.current) {
        onPageIndexChange(target);
        return;
      }

      busyRef.current = true;
      setFlipClass(target > pageIndex ? "notebook-flip-forward" : "notebook-flip-back");
      window.setTimeout(() => {
        onPageIndexChange(target);
        setFlipClass("");
        busyRef.current = false;
      }, FLIP_MS);
    },
    [onPageIndexChange, pageIndex, total],
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
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipTo, pageIndex]);

  const flipping = Boolean(flipClass);

  return (
    <div className={cn("notebook-page-flip relative", className)}>
      <div
        className={cn(
          "notebook-page-flip-stage relative [perspective:1400px]",
          flipping && "notebook-page-flip-stage-active",
        )}
        onTouchStart={(e) => {
          touchStartX.current = e.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start == null) return;
          const end = e.changedTouches[0]?.clientX ?? start;
          const dx = end - start;
          if (dx > 72) flipTo(pageIndex - 1);
          else if (dx < -72) flipTo(pageIndex + 1);
        }}
      >
        <div
          className={cn(
            "notebook-page-flip-sheet relative overflow-hidden rounded-xl border border-amber-900/25 bg-gradient-to-br from-amber-50/[0.08] via-white/[0.03] to-amber-950/[0.12] shadow-[inset_0_0_48px_rgba(0,0,0,0.22),0_12px_40px_-20px_rgba(0,0,0,0.65)]",
            flipClass,
          )}
        >
          <div
            className={cn(
              "notebook-page-flip-content min-h-[280px] transition-opacity duration-200",
              flipping && "pointer-events-none opacity-90",
            )}
          >
            {children}
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-amber-950/35 via-amber-900/10 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/25 to-transparent"
            aria-hidden
          />
        </div>
      </div>

      <button
        type="button"
        className="absolute left-0 top-0 z-10 flex h-[calc(100%-3.5rem)] w-[14%] items-center justify-start rounded-l-xl pl-1 text-white/70 transition hover:bg-black/10 focus-visible:bg-black/15 focus-visible:outline-none"
        aria-label="Página anterior"
        disabled={pageIndex <= 0 || flipping}
        onClick={() => flipTo(pageIndex - 1)}
      >
        <span className="rounded-full bg-black/45 p-1.5 shadow-lg backdrop-blur-sm">
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </span>
      </button>
      <button
        type="button"
        className="absolute right-0 top-0 z-10 flex h-[calc(100%-3.5rem)] w-[14%] items-center justify-end rounded-r-xl pr-1 text-white/70 transition hover:bg-black/10 focus-visible:bg-black/15 focus-visible:outline-none"
        aria-label="Página siguiente"
        disabled={pageIndex >= total - 1 || flipping}
        onClick={() => flipTo(pageIndex + 1)}
      >
        <span className="rounded-full bg-black/45 p-1.5 shadow-lg backdrop-blur-sm">
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      </button>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
        <button
          type="button"
          className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={pageIndex <= 0 || flipping}
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
          disabled={pageIndex >= total - 1 || flipping}
          onClick={() => flipTo(pageIndex + 1)}
        >
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <p className="mt-1 text-center text-[11px] text-slate-600">{hint}</p>
    </div>
  );
}
