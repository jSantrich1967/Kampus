import Image from "next/image";

import { cn } from "@/lib/cn";

type KampusLogoProps = {
  variant?: "sidebar" | "header";
  className?: string;
};

/**
 * Official Kampus mark (includes wordmark). PNG should use real transparency (RGBA),
 * not black-filled “transparent”. Served from `/branding/kampus-logo.png`.
 * `unoptimized` keeps the file as-is so alpha is not altered by the image pipeline.
 */
export function KampusLogo({ variant = "sidebar", className }: KampusLogoProps) {
  const isHeader = variant === "header";
  return (
    <Image
      src="/branding/kampus-logo.png"
      alt="Kampus"
      width={isHeader ? 420 : 720}
      height={isHeader ? 420 : 820}
      priority={!isHeader}
      unoptimized
      className={cn(
        "bg-transparent object-contain object-left",
        isHeader ? "h-14 w-auto max-w-[280px]" : "h-[124px] w-auto max-w-[440px]",
        className,
      )}
    />
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
    <span className={cn("relative inline-block overflow-hidden rounded-2xl bg-transparent", sizeClassName, className)}>
      <Image
        src="/branding/kampus-logo.png"
        alt="Kampus"
        fill
        sizes="64px"
        unoptimized
        className="bg-transparent object-cover object-[50%_30%]"
        priority={false}
      />
    </span>
  );
}
