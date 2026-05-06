"use client";

import type { ReactNode } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { cn } from "@/lib/cn";
import { shellThemeFromRole } from "@/lib/layout/shell-theme";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

/**
 * Shared page chrome — keeps hierarchy consistent across modules.
 * Eyebrow tint follows shell theme (student vs docente vs institución).
 */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  const { profile, hydrated } = useKampus();
  const theme = hydrated ? shellThemeFromRole(profile.role) : "student";
  const eyebrowTone =
    theme === "faculty"
      ? "text-teal-200/85"
      : theme === "institution"
        ? "text-amber-200/85"
        : "text-indigo-200/80";

  return (
    <div className={cn("flex flex-col gap-4 border-b border-white/5 pb-8 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <div className={cn("text-xs font-semibold uppercase tracking-[0.2em]", eyebrowTone)}>{eyebrow}</div>
        ) : null}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-base text-slate-300">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
