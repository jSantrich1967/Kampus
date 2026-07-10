"use client";

import { Canvas } from "@react-three/fiber";
import { Maximize2, Minimize2, Rotate3d } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DEFAULT_CELL_PARTS,
  type CellPartId,
  type CellPartInfo,
} from "@/components/study/class-slide-3d/cell-scene";
import { cn } from "@/lib/cn";

const CellScene = dynamic(
  () => import("@/components/study/class-slide-3d/cell-scene").then((m) => m.CellScene),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-slate-400">Cargando 3D…</div> },
);

type Props = {
  slideTitle?: string;
  bullets?: string[];
  className?: string;
};

function buildCellParts(bullets: string[]): CellPartInfo[] {
  const findBullet = (pattern: RegExp) => bullets.find((b) => pattern.test(b));

  return DEFAULT_CELL_PARTS.map((part) => {
    const patterns: Record<CellPartId, RegExp> = {
      nucleus: /n[uú]cleo/i,
      membrane: /membrana/i,
      mitochondria: /mitocondria/i,
      cytoplasm: /citoplasma/i,
    };
    const match = findBullet(patterns[part.id]);
    return match ? { ...part, description: match.length > 220 ? `${match.slice(0, 217)}…` : match } : part;
  });
}

export function ClassSlide3DViewer({ slideTitle, bullets = [], className }: Props) {
  const [selectedId, setSelectedId] = useState<CellPartId | null>(null);
  const [expanded, setExpanded] = useState(false);

  const parts = useMemo(() => buildCellParts(bullets), [bullets]);
  const selected = parts.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setExpanded(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [expanded]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-slate-900 to-slate-950 shadow-xl",
        expanded && "fixed inset-4 z-[150] flex flex-col md:inset-8",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-200/80">
          <Rotate3d className="h-4 w-4" />
          Modelo 3D interactivo
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <Minimize2 className="mr-1 h-3.5 w-3.5" /> : <Maximize2 className="mr-1 h-3.5 w-3.5" />}
            {expanded ? "Salir" : "Pantalla completa"}
          </Button>
        </div>
      </div>

      <div className={cn("grid min-h-[280px] gap-0", expanded ? "flex-1 lg:grid-cols-[1fr_280px]" : "lg:grid-cols-[1fr_220px]")}>
        <div className={cn("relative min-h-[260px]", expanded && "min-h-0 flex-1")}>
          <Canvas camera={{ position: [0, 0.2, 3.4], fov: 42 }} className="!h-full !w-full" dpr={[1, 2]}>
            <CellScene selectedId={selectedId} onSelect={setSelectedId} parts={parts} />
          </Canvas>
          <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-[10px] text-white/70 backdrop-blur-sm">
            Arrastra para girar · Clic en una parte · Rueda para zoom
          </p>
        </div>

        <aside className="flex flex-col gap-3 border-t border-white/10 bg-black/35 p-3 lg:border-l lg:border-t-0 sm:p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/45">Explora la célula</p>
          <div className="flex flex-wrap gap-1.5 lg:flex-col">
            {parts.map((part) => (
              <button
                key={part.id}
                type="button"
                onClick={() => setSelectedId(part.id)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left text-xs transition",
                  selectedId === part.id
                    ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20",
                )}
              >
                {part.label}
              </button>
            ))}
          </div>
          {selected ? (
            <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-sm font-semibold text-white">{selected.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">{selected.description}</p>
            </div>
          ) : (
            <p className="mt-auto text-xs leading-relaxed text-slate-500">
              {slideTitle ? `Toca una parte del modelo de «${slideTitle}».` : "Toca una parte del modelo o un botón de la lista."}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
