import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

/** Shared styles for `<Button />` and `<Link className={buttonClasses(...)} />`. */
export function buttonClasses(opts?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const variant = opts?.variant ?? "primary";
  const size = opts?.size ?? "md";
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus:outline-none disabled:pointer-events-none disabled:opacity-40",
    size === "sm" && "px-3 py-2 text-xs",
    size === "md" && "px-4 py-2.5 text-sm",
    size === "lg" && "px-5 py-3 text-base",
    variant === "primary" &&
      "bg-gradient-to-r from-indigo-500 to-cyan-400 text-slate-950 shadow-lg shadow-indigo-500/25 hover:brightness-110",
    variant === "secondary" &&
      "border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10",
    variant === "ghost" && "text-slate-200 hover:bg-white/5",
    variant === "danger" && "bg-rose-500/90 text-white hover:bg-rose-500",
    opts?.className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref,
) {
  return <button ref={ref} className={buttonClasses({ variant, size, className })} {...props} />;
});
