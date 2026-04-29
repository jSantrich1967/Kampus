import { cn } from "@/lib/cn";

type Props = {
  subject: string;
  className?: string;
};

/**
 * Branded notebook cover using the provided base image.
 * Renders a dynamic subject label while keeping the exact cover style.
 */
export function KampusNotebookCover({ subject, className }: Props) {
  const label = subject.trim() || "General";
  // Keep label short for small cards.
  const short = label.length > 18 ? `${label.slice(0, 17)}…` : label;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl ring-1 ring-white/10", className)} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/notebook-cover-base.png"
        alt=""
        decoding="async"
        className="h-full w-full object-cover"
      />

      {/* Cover the original static text area, then render dynamic label */}
      <div className="absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 pb-[10%]">
        <div className="h-px w-[60%] bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
        <div className="text-center text-[11px] font-semibold tracking-wide text-slate-100 drop-shadow">
          {short}
        </div>
      </div>
    </div>
  );
}

