import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

/**
 * Shared page chrome — keeps hierarchy consistent across modules.
 */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 border-b border-white/5 pb-8 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200/80">{eyebrow}</div>
        ) : null}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-base text-slate-300">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
