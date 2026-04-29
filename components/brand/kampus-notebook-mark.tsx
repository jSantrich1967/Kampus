import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  /** Tailwind size classes, e.g. "h-10 w-10" */
  sizeClassName?: string;
};

/**
 * Small notebook mark (inline SVG) in Kampus colors.
 * This avoids relying on external PNG assets and stays crisp on all screens.
 */
export function KampusNotebookMark({ className, sizeClassName = "h-10 w-10" }: Props) {
  return (
    <span className={cn("inline-flex items-center justify-center", sizeClassName, className)} aria-hidden="true">
      <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="k_nb_cover" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0B1220" />
            <stop offset="1" stopColor="#111D35" />
          </linearGradient>
          <linearGradient id="k_nb_edge" x1="16" y1="10" x2="50" y2="54" gradientUnits="userSpaceOnUse">
            <stop stopColor="#22D3EE" stopOpacity="0.95" />
            <stop offset="0.55" stopColor="#3B82F6" stopOpacity="0.95" />
            <stop offset="1" stopColor="#1D4ED8" stopOpacity="0.95" />
          </linearGradient>
          <filter id="k_nb_shadow" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000000" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Notebook body */}
        <g filter="url(#k_nb_shadow)">
          <rect x="18" y="10" width="36" height="44" rx="10" fill="url(#k_nb_cover)" stroke="rgba(255,255,255,0.12)" />
          {/* Right elastic band */}
          <rect x="46" y="12" width="4" height="40" rx="2" fill="rgba(59,130,246,0.35)" />
          <rect x="47.2" y="12" width="1.6" height="40" rx="0.8" fill="rgba(255,255,255,0.10)" />
          {/* Brand “K” tile */}
          <path
            d="M27 24c0-3.866 3.134-7 7-7h4c3.866 0 7 3.134 7 7v4c0 3.866-3.134 7-7 7h-4c-3.866 0-7-3.134-7-7v-4Z"
            fill="url(#k_nb_edge)"
            opacity="0.95"
          />
          <path
            d="M33 20.8h2.7v5l4.1-5h3.3l-4.9 5.9 5.2 6.5h-3.4l-4.3-5.3v5.3H33V20.8Z"
            fill="white"
            opacity="0.92"
          />
        </g>

        {/* Spiral rings */}
        <g opacity="0.95">
          {[
            { y: 16 },
            { y: 24 },
            { y: 32 },
            { y: 40 },
            { y: 48 },
          ].map((r, i) => (
            <g key={i}>
              <circle cx="14" cy={r.y} r="3.2" stroke="rgba(255,255,255,0.55)" strokeWidth="1.6" />
              <circle cx="14" cy={r.y} r="1.4" fill="rgba(15,23,42,0.9)" />
            </g>
          ))}
        </g>

        {/* Left binding strip */}
        <rect x="18" y="12" width="4" height="40" rx="2" fill="rgba(255,255,255,0.06)" />
      </svg>
    </span>
  );
}

