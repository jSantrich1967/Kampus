import { cn } from "@/lib/cn";

/** Marcador de carga con forma del contenido (evita el "Cargando…" seco). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-white/10", className)} />;
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4" aria-hidden>
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
      <Skeleton className="h-9 w-32" />
    </div>
  );
}
