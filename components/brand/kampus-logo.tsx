import { cn } from "@/lib/cn";

import { KampusLockupSvg, KampusMark as KampusMarkImage } from "@/components/brand/kampus-mark-svg";

type KampusLogoProps = {
  variant?: "sidebar" | "header" | "hero";
  headerContext?: "shell" | "marketing";
  className?: string;
};

const VARIANT_STYLES = {
  header: "text-[1.05rem] sm:text-[1.15rem]",
  sidebar: "text-[1.1rem]",
  hero: "text-[1.65rem] sm:text-[1.85rem]",
} as const;

/** Official lockup — ribbon K + wordmark, transparent background. */
export function KampusLogo({ variant = "sidebar", className }: KampusLogoProps) {
  return <KampusLockupSvg className={cn(VARIANT_STYLES[variant], className)} />;
}

type KampusMarkProps = {
  sizeClassName?: string;
  className?: string;
};

export function KampusMark({ sizeClassName = "h-10 w-10", className }: KampusMarkProps) {
  return <KampusMarkImage sizeClassName={sizeClassName} className={className} />;
}
