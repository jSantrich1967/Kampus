import { useId } from "react";

import { cn } from "@/lib/cn";

/** Transparent SVG lockup — use instead of PNG (which has a baked-in background). */
export const KAMPUS_LOGO_LOCKUP_SRC = "/branding/kampus-logo-lockup.png";

type KampusMarkProps = {
  className?: string;
  sizeClassName?: string;
};

function KampusRibbonMark({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const stem = `k-stem-${uid}`;
  const upper = `k-upper-${uid}`;
  const lower = `k-lower-${uid}`;

  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("h-full w-full", className)}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={stem} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="55%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id={upper} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6d28d9" />
          <stop offset="55%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id={lower} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#312e81" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>

      {/* Vertical stem */}
      <rect x="3" y="4" width="9.5" height="32" rx="4.75" fill={`url(#${stem})`} />

      {/* Upper ribbon arm */}
      <path
        d="M12.5 19.5 C12.5 11 20 6.5 34 5 L34 12.5 C24 13.5 19 16.5 15.5 20 Z"
        fill={`url(#${upper})`}
      />

      {/* Lower ribbon leg */}
      <path
        d="M15.5 20.5 C19 23.5 24.5 28.5 34.5 33.5 L34.5 26.5 C26 22.5 20.5 21 14.5 20.5 Z"
        fill={`url(#${lower})`}
      />
    </svg>
  );
}

/** Ribbon "K" emblem only. */
export function KampusMark({ sizeClassName = "h-9 w-9", className }: KampusMarkProps) {
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center", sizeClassName, className)}>
      <KampusRibbonMark />
    </span>
  );
}

type KampusLockupProps = {
  className?: string;
  markOnly?: boolean;
  /** @deprecated Wordmark is part of the lockup SVG. */
  wordmarkClassName?: string;
  /** @deprecated Use KampusAnimatedLogo for entrance animation. */
  animate?: boolean;
};

/** Full logo: ribbon K + "Kampus" on transparent background. */
export function KampusLockup({ className, markOnly = false }: KampusLockupProps) {
  if (markOnly) {
    return <KampusMark className={className} />;
  }

  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-2.5", className)}
      role="img"
      aria-label="Kampus"
    >
      <KampusMark sizeClassName="h-[1.35em] w-[1.35em]" />
      <span className="text-[1.35em] font-bold leading-none tracking-tight text-white">Kampus</span>
    </span>
  );
}

/** @deprecated Use KampusMark. */
export function KampusMarkSvg(props: KampusMarkProps) {
  return <KampusMark {...props} />;
}

/** Same lockup as inline SVG (for img-based components). */
export function KampusLockupSvg({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-2.5 text-base", className)} role="img" aria-label="Kampus">
      <KampusMark sizeClassName="h-[1.35em] w-[1.35em]" />
      <span className="text-[1.35em] font-bold leading-none tracking-tight text-white">Kampus</span>
    </span>
  );
}
