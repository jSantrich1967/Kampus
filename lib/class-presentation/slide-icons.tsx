import {
  Atom,
  BookOpen,
  Brain,
  Calculator,
  ChartLine,
  Code,
  FlaskConical,
  Globe,
  Layers,
  Lightbulb,
  Scale,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";

import type { SlideVisualIcon } from "@/lib/schemas/class-presentation";

const ICON_MAP: Record<SlideVisualIcon, LucideIcon> = {
  lightbulb: Lightbulb,
  "book-open": BookOpen,
  "chart-line": ChartLine,
  brain: Brain,
  calculator: Calculator,
  layers: Layers,
  target: Target,
  sparkles: Sparkles,
  "flask-conical": FlaskConical,
  globe: Globe,
  scale: Scale,
  code: Code,
  atom: Atom,
};

export function resolveSlideIcon(name: SlideVisualIcon | undefined, index: number): LucideIcon {
  if (name && ICON_MAP[name]) return ICON_MAP[name];
  const fallback = [Lightbulb, BookOpen, ChartLine, Brain, Target, Sparkles];
  return fallback[index % fallback.length]!;
}
