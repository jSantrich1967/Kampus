"use client";

import { Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSlideIllustration } from "@/lib/hooks/use-slide-illustration";
import { cn } from "@/lib/cn";

type Props = {
  slideId: string;
  prompt?: string;
  subjectHint: string;
  className?: string;
};

export function ClassSlideIllustration({ slideId, prompt, subjectHint, className }: Props) {
  const { dataUrl, loading, error, retry } = useSlideIllustration(slideId, prompt, subjectHint);

  if (!prompt?.trim()) return null;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-white/15 bg-black/30 shadow-xl", className)}>
      {loading ? (
        <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Ilustración IA…
          </div>
          <p className="text-xs text-slate-500">Suele tardar 10–20 s</p>
        </div>
      ) : null}
      {!loading && error ? (
        <div className="flex aspect-[16/10] flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-xs text-amber-200/90">{error}</p>
          <Button type="button" size="sm" variant="secondary" className="gap-1.5" onClick={retry}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reintentar
          </Button>
        </div>
      ) : null}
      {!loading && dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- base64 illustration from OpenAI
        <img src={dataUrl} alt="" className="aspect-[16/10] w-full object-cover" />
      ) : null}
    </div>
  );
}
