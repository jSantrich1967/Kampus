import { cn } from "@/lib/cn";

type KampusLogoProps = {
  variant?: "sidebar" | "header";
  className?: string;
};

/** Official Kampus mark (RGBA PNG) at `/branding/kampus-logo.png`. */
export function KampusLogo({ variant = "sidebar", className }: KampusLogoProps) {
  const isHeader = variant === "header";
  return (
    // eslint-disable-next-line @next/next/no-img-element -- intentional: preserve PNG alpha without optimizer wrappers
    <img
      src="/branding/kampus-logo.png"
      alt="Kampus"
      width={isHeader ? 420 : 720}
      height={isHeader ? 420 : 820}
      decoding="async"
      fetchPriority={isHeader ? "auto" : "high"}
      className={cn(
        "block max-w-full bg-transparent object-contain object-left",
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
        className="h-full w-full bg-transparent object-cover object-[50%_30%]"
      />
    </span>
  );
}
