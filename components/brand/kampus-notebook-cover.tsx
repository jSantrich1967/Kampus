import { KampusMark } from "@/components/brand/kampus-mark-svg";
import { cn } from "@/lib/cn";

type Props = {
  subject: string;
  className?: string;
};

const SPIRAL_RINGS = [12, 24, 36, 48, 60, 72, 84] as const;

/**
 * Branded notebook cover with the ribbon K logo (Lumina).
 * Pure CSS/SVG — no baked-in legacy shield artwork.
 */
export function KampusNotebookCover({ subject, className }: Props) {
  const label = subject.trim() || "General";
  const short = label.length > 18 ? `${label.slice(0, 17)}…` : label;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-r-xl rounded-l-md bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#020617] shadow-lg ring-1 ring-white/10",
        className,
      )}
      aria-hidden="true"
    >
      {/* Page edge depth */}
      <div className="absolute inset-y-2 right-0 w-1.5 rounded-r-sm bg-gradient-to-r from-slate-700/40 to-slate-500/20" />

      {/* Spiral binding */}
      <div className="absolute inset-y-0 left-0 w-[14%] border-r border-white/10 bg-gradient-to-r from-slate-800/90 to-slate-900/60">
        {SPIRAL_RINGS.map((top) => (
          <span
            key={top}
            className="absolute left-[18%] h-2 w-2 -translate-x-1/2 rounded-full border border-slate-400/50 bg-slate-700/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
            style={{ top: `${top}%` }}
          />
        ))}
      </div>

      {/* Brand mark */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pl-[10%] pt-1">
        <KampusMark sizeClassName="h-[38%] w-[38%] min-h-7 min-w-7 max-h-12 max-w-12" />
        <span className="mt-[6%] text-[0.52rem] font-bold tracking-wide text-white sm:text-[0.58rem]">
          Kampus
        </span>
      </div>

      {/* Subject label */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/75 to-transparent px-2 pb-[10%] pt-[18%] pl-[14%]">
        <div className="mx-auto mb-1 h-px w-[55%] bg-gradient-to-r from-transparent via-violet-400/45 to-transparent" />
        <p className="text-center text-[0.52rem] font-semibold leading-tight tracking-wide text-slate-100 drop-shadow sm:text-[0.58rem]">
          {short}
        </p>
      </div>
    </div>
  );
}
