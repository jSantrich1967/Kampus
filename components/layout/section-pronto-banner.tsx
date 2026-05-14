"use client";

import { Sparkles } from "lucide-react";

import { cn } from "@/lib/cn";
import { sectionProntoCopy } from "@/lib/i18n/section-pronto";

type SectionProntoBannerProps = {
  kind: "teacher" | "institution";
  className?: string;
};

/**
 * Aviso no intrusivo: sección usable en demo pero aún no “activada” del todo.
 */
export function SectionProntoBanner({ kind, className }: SectionProntoBannerProps) {
  const t = sectionProntoCopy.es;
  const isTeacher = kind === "teacher";

  return (
    <div
      role="status"
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm shadow-sm",
        isTeacher
          ? "border-teal-400/35 bg-teal-500/10 text-teal-50"
          : "border-amber-400/35 bg-amber-500/10 text-amber-50",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 opacity-90" aria-hidden />
        <div className="min-w-0">
          <div className="font-semibold leading-snug">
            {isTeacher ? t.teacherTitle : t.institutionTitle}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-white/85">
            {isTeacher ? t.teacherBody : t.institutionBody}
          </p>
        </div>
      </div>
    </div>
  );
}
