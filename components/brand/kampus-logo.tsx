import { cn } from "@/lib/cn";

type KampusLogoProps = {
  variant?: "sidebar" | "header";
  className?: string;
};

/**
 * `/branding/kampus-logo.png` — if the export includes a fake “transparency” grid or white
 * margins, `clip-path` trims the edges so only the mark shows on the page background.
 */
export function KampusLogo({ variant = "sidebar", className }: KampusLogoProps) {
  const isHeader = variant === "header";
  return (
    // eslint-disable-next-line @next/next/no-img-element -- preserve PNG alpha; avoid Image optimizer
    <img
      src="/branding/kampus-logo.png"
      alt="Kampus"
      width={isHeader ? 420 : 720}
      height={isHeader ? 420 : 820}
      decoding="async"
      fetchPriority={isHeader ? "auto" : "high"}
      className={cn(
        "block max-w-full bg-transparent object-contain object-left [clip-path:inset(7%_6%_5%_6%)] drop-shadow-[0_8px_32px_rgba(15,23,42,0.55)]",
        isHeader ? "h-16 w-auto max-w-[min(100%,320px)] sm:h-[4.5rem]" : "h-36 w-auto max-w-[min(100%,480px)] sm:h-44 md:h-52",
        className,
      )}
    />
  );
}

type KampusMarkProps = {
  sizeClassName?: string;
  className?: string;
};

/** Compact mark (icon only). Crops the shared asset to hide the wordmark. */
export function KampusMark({ sizeClassName = "h-10 w-10", className }: KampusMarkProps) {
  return (
    <span className={cn("relative inline-block overflow-hidden rounded-2xl bg-transparent", sizeClassName, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/kampus-logo.png"
        alt="Kampus"
        decoding="async"
        className="h-full w-full bg-transparent object-cover object-[50%_28%] [clip-path:inset(6%_6%_38%_6%)]"
      />
    </span>
  );
}
