import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "accent" | "warning" | "success" | "danger";
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        tone === "neutral" && "bg-white/5 text-slate-300 ring-1 ring-white/10",
        tone === "accent" && "bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-400/30",
        tone === "warning" && "bg-amber-400/10 text-amber-100 ring-1 ring-amber-300/30",
        tone === "success" && "bg-emerald-400/10 text-emerald-100 ring-1 ring-emerald-300/30",
        tone === "danger" && "bg-rose-500/15 text-rose-100 ring-1 ring-rose-400/30",
        className,
      )}
      {...props}
    />
  );
}
