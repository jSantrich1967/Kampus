"use client";

import { Loader2 } from "lucide-react";

import { useSlideIllustration } from "@/lib/hooks/use-slide-illustration";
import { cn } from "@/lib/cn";

type Props = {
  slideId: string;
  prompt?: string;
  subjectHint: string;
  className?: string;
};

export function ClassSlideIllustration({ slideId, prompt, subjectHint, className }: Props) {
  const { dataUrl, loading, error } = useSlideIllustration(slideId, prompt, subjectHint);

  if (!prompt?.trim()) return null;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-white/15 bg-black/30 shadow-xl", className)}>
      {loading ? (
        <div className="flex aspect-[16/10] items-center justify-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Ilustración IA…
        </div>
      ) : null}
      {!loading && error ? (
        <div className="flex aspect-[16/10] items-center justify-center px-4 text-center text-xs text-amber-200/90">{error}</div>
      ) : null}
      {!loading && dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- base64 illustration from OpenAI
        <img src={dataUrl} alt="" className="aspect-[16/10] w-full object-cover" />
      ) : null}
    </div>
  );
}
