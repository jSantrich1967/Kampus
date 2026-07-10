import type { SlideAccent } from "@/lib/schemas/class-presentation";

export type SlideTheme = {
  gradient: string;
  glow: string;
  border: string;
  iconBg: string;
  bulletBorder: string;
  quoteText: string;
};

const THEMES: Record<SlideAccent, SlideTheme> = {
  violet: {
    gradient: "from-violet-600/30 via-fuchsia-600/10 to-slate-950",
    glow: "shadow-violet-500/25",
    border: "border-violet-400/30",
    iconBg: "bg-violet-500/25 text-violet-100 ring-violet-400/40",
    bulletBorder: "border-violet-400/20 bg-violet-500/[0.08]",
    quoteText: "text-violet-100",
  },
  cyan: {
    gradient: "from-cyan-600/30 via-sky-600/10 to-slate-950",
    glow: "shadow-cyan-500/25",
    border: "border-cyan-400/30",
    iconBg: "bg-cyan-500/25 text-cyan-100 ring-cyan-400/40",
    bulletBorder: "border-cyan-400/20 bg-cyan-500/[0.08]",
    quoteText: "text-cyan-100",
  },
  amber: {
    gradient: "from-amber-600/30 via-orange-600/10 to-slate-950",
    glow: "shadow-amber-500/25",
    border: "border-amber-400/30",
    iconBg: "bg-amber-500/25 text-amber-100 ring-amber-400/40",
    bulletBorder: "border-amber-400/20 bg-amber-500/[0.08]",
    quoteText: "text-amber-100",
  },
  rose: {
    gradient: "from-rose-600/30 via-pink-600/10 to-slate-950",
    glow: "shadow-rose-500/25",
    border: "border-rose-400/30",
    iconBg: "bg-rose-500/25 text-rose-100 ring-rose-400/40",
    bulletBorder: "border-rose-400/20 bg-rose-500/[0.08]",
    quoteText: "text-rose-100",
  },
  emerald: {
    gradient: "from-emerald-600/30 via-teal-600/10 to-slate-950",
    glow: "shadow-emerald-500/25",
    border: "border-emerald-400/30",
    iconBg: "bg-emerald-500/25 text-emerald-100 ring-emerald-400/40",
    bulletBorder: "border-emerald-400/20 bg-emerald-500/[0.08]",
    quoteText: "text-emerald-100",
  },
};

const ACCENT_ROTATION: SlideAccent[] = ["violet", "cyan", "amber", "emerald", "rose"];

export function slideThemeFor(accent: SlideAccent | undefined, index: number): SlideTheme {
  const key = accent ?? ACCENT_ROTATION[index % ACCENT_ROTATION.length]!;
  return THEMES[key];
}
