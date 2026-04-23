import Image from "next/image";

import { cn } from "@/lib/cn";

type KampusLogoProps = {
  variant?: "sidebar" | "header";
  className?: string;
  /**
   * Reuses the same base color and radial glows as `body` (globals.css) behind the PNG
   * so the asset’s dark frame blends with the page. For a perfect edge, use a PNG with
   * transparent pixels outside the icon.
   */
  ambient?: boolean;
};

/** Official Kampus mark (includes wordmark). Served from `/branding/kampus-logo.png`. */
export function KampusLogo({ variant = "sidebar", className, ambient = false }: KampusLogoProps) {
  const isHeader = variant === "header";
  const image = (
    <Image
      src="/branding/kampus-logo.png"
      alt="Kampus"
      width={isHeader ? 420 : 720}
      height={isHeader ? 420 : 820}
      priority={!isHeader}
      className={cn(
        "object-contain object-left",
        isHeader ? "h-14 w-auto max-w-[280px]" : "h-[124px] w-auto max-w-[440px]",
        ambient && "relative z-[1] drop-shadow-[0_2px_24px_rgba(99,102,241,0.2)]",
        className,
      )}
    />
  );

  if (!ambient) {
    return image;
  }

  return (
    <span className="relative inline-flex overflow-hidden rounded-3xl bg-[var(--color-kampus-bg)] p-1.5 ring-1 ring-white/[0.09] shadow-[0_12px_48px_-18px_rgba(99,102,241,0.45)] sm:p-2">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(99,102,241,0.18),transparent_55%),radial-gradient(900px_500px_at_100%_0%,rgba(45,212,191,0.12),transparent_50%)]"
      />
      <span className="relative z-[1] inline-flex">{image}</span>
    </span>
  );
}

type KampusMarkProps = {
  /**
   * Tamaño en Tailwind para el contenedor (ej: "h-10 w-10").
   * Si no lo pasas, usa un tamaño cómodo para UI compacta.
   */
  sizeClassName?: string;
  className?: string;
};

/**
 * Compact mark (icon only). It crops the shared asset to hide the wordmark.
 * Useful for favicons, small buttons, and tight headers.
 */
export function KampusMark({ sizeClassName = "h-10 w-10", className }: KampusMarkProps) {
  return (
    <span className={cn("relative inline-block overflow-hidden rounded-2xl", sizeClassName, className)}>
      <Image
        src="/branding/kampus-logo.png"
        alt="Kampus"
        fill
        sizes="64px"
        className="object-cover object-[50%_30%]"
        priority={false}
      />
    </span>
  );
}
