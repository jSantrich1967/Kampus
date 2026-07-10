import type { LucideIcon } from "lucide-react";

import type { SlideTheme } from "@/lib/class-presentation/slide-theme";
import { cn } from "@/lib/cn";

type Props = {
  Icon: LucideIcon;
  theme: SlideTheme;
  className?: string;
};

export function ClassSlideHeroArt({ Icon, theme, className }: Props) {
  return (
    <div className={cn("relative flex h-36 w-36 shrink-0 items-center justify-center md:h-44 md:w-44", className)}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 160 160" aria-hidden>
        <defs>
          <radialGradient id="slide-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.18" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="80" cy="80" r="72" fill="url(#slide-glow)" />
        <circle cx="80" cy="80" r="58" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
        <circle cx="80" cy="80" r="44" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" strokeDasharray="4 6" />
        {[0, 60, 120, 180, 240, 300].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x = 80 + Math.cos(rad) * 52;
          const y = 80 + Math.sin(rad) * 52;
          return <circle key={deg} cx={x} cy={y} r="3" fill="white" fillOpacity="0.2" />;
        })}
      </svg>
      <div
        className={cn(
          "relative flex h-20 w-20 items-center justify-center rounded-3xl ring-1 shadow-2xl md:h-24 md:w-24",
          theme.iconBg,
          theme.glow,
        )}
      >
        <Icon className="h-10 w-10 md:h-12 md:w-12" strokeWidth={1.5} />
      </div>
    </div>
  );
}
