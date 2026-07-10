"use client";

import { BookOpen, ChevronRight } from "lucide-react";

import { KampusMark } from "@/components/brand/kampus-mark-svg";
import { Button } from "@/components/ui/button";
import { getNotebookSubjectIcon } from "@/components/study/notebook-subject-icon";
import { initialsFromSubject } from "@/lib/notebooks/cover-styles";
import { getSubjectCoverTheme } from "@/lib/notebooks/subject-cover-theme";
import { cn } from "@/lib/cn";

type Props = {
  subject: string;
  pageCount: number;
  onOpen: () => void;
  className?: string;
};

function CoverTexture({ texture }: { texture: ReturnType<typeof getSubjectCoverTheme>["texture"] }) {
  if (texture === "grid") {
    return (
      <svg className="absolute inset-0 h-full w-full opacity-[0.14]" aria-hidden>
        <defs>
          <pattern id="nb-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="white" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#nb-grid)" />
      </svg>
    );
  }
  if (texture === "rings") {
    return (
      <svg className="absolute inset-0 h-full w-full opacity-[0.12]" aria-hidden>
        <circle cx="78%" cy="42%" r="120" fill="none" stroke="white" strokeWidth="1.2" />
        <circle cx="78%" cy="42%" r="180" fill="none" stroke="white" strokeWidth="0.8" />
        <circle cx="78%" cy="42%" r="240" fill="none" stroke="white" strokeWidth="0.5" />
      </svg>
    );
  }
  if (texture === "waves") {
    return (
      <svg className="absolute inset-0 h-full w-full opacity-[0.16]" aria-hidden viewBox="0 0 800 400" preserveAspectRatio="none">
        <path
          d="M0,220 C120,160 240,280 360,210 C480,140 600,250 800,190 L800,400 L0,400 Z"
          fill="white"
          fillOpacity="0.08"
        />
        <path
          d="M0,280 C140,230 280,320 420,260 C560,200 680,300 800,250 L800,400 L0,400 Z"
          fill="white"
          fillOpacity="0.05"
        />
      </svg>
    );
  }
  return (
    <svg className="absolute inset-0 h-full w-full opacity-[0.18]" aria-hidden>
      <defs>
        <pattern id="nb-dots" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="white" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#nb-dots)" />
    </svg>
  );
}

export function NotebookCoverSpread({ subject, pageCount, onOpen, className }: Props) {
  const label = subject.trim() || "General";
  const theme = getSubjectCoverTheme(label);
  const { Icon, label: iconLabel } = getNotebookSubjectIcon(label);
  const initials = initialsFromSubject(label);

  return (
    <div
      className={cn(
        "relative flex min-h-[min(72vh,620px)] flex-col overflow-hidden rounded-xl border border-white/15 shadow-inner",
        className,
      )}
      style={{
        background: `linear-gradient(145deg, color-mix(in oklab, ${theme.accent} 28%, #0f172a) 0%, #020617 48%, color-mix(in oklab, ${theme.accent} 12%, #030712) 100%)`,
      }}
    >
      <CoverTexture texture={theme.texture} />

      <div
        className="pointer-events-none absolute -right-6 top-1/2 -translate-y-1/2 opacity-[0.11]"
        aria-hidden
      >
        <Icon className="h-56 w-56 md:h-72 md:w-72" strokeWidth={0.75} />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-slate-950/30" />

      <div className="relative z-10 flex flex-1 flex-col justify-between p-8 md:p-12">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 text-lg font-bold text-white shadow-lg"
              style={{ background: `color-mix(in oklab, ${theme.accent} 35%, transparent)` }}
            >
              {initials}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Kampus</p>
              <p className="text-xs text-white/55">{iconLabel}</p>
            </div>
          </div>
          <KampusMark sizeClassName="h-10 w-10 opacity-80" />
        </div>

        <div className="my-auto max-w-2xl py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/40">Cuaderno de</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-white md:text-5xl">{label}</h2>
          <p
            className="mt-4 max-w-xl text-lg leading-relaxed text-white/75 md:text-xl"
            style={{ borderLeft: `3px solid color-mix(in oklab, ${theme.accent} 70%, white)` }}
          >
            <span className="pl-4 italic">{theme.allegory}</span>
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="text-sm text-white/50">
            <p>
              {pageCount} hoja{pageCount === 1 ? "" : "s"} · Abre para hojear con efecto de página
            </p>
          </div>
          <Button type="button" className="gap-2 shadow-lg shadow-indigo-950/40" onClick={onOpen}>
            <BookOpen className="h-4 w-4" aria-hidden />
            Abrir cuaderno
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
