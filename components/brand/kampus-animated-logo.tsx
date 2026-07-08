"use client";

import { cn } from "@/lib/cn";

import { KampusLockupSvg } from "@/components/brand/kampus-mark-svg";

type KampusAnimatedLogoProps = {
  className?: string;
  animate?: boolean;
};

/** Official brand lockup for auth screens. */
export function KampusAnimatedLogo({ className, animate = true }: KampusAnimatedLogoProps) {
  return (
    <KampusLockupSvg
      className={cn("text-[1.75rem] sm:text-[2rem]", animate && "kampus-mark-enter", className)}
    />
  );
}
