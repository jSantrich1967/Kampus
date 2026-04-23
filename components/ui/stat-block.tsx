import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type StatBlockProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
};

export function StatBlock({ label, value, hint, className }: StatBlockProps) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-slate-950/40 p-4", className)}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
    </div>
  );
}
