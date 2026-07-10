"use client";

import { Eraser, Pencil, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Point = { x: number; y: number };
type Stroke = { points: Point[]; color: string; width: number; erase?: boolean };

type Props = {
  documentId: string;
  imageUrl: string;
  className?: string;
};

const COLORS = ["#a78bfa", "#22d3ee", "#fbbf24", "#fb7185", "#34d399"] as const;

function storageKey(documentId: string) {
  return `kampus-annotate:${documentId}`;
}

export function NotebookPageAnnotator({ documentId, imageUrl, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const toolRef = useRef<"pen" | "eraser">("pen");
  const colorRef = useRef<string>(COLORS[0]);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);

  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState<string>(COLORS[0]);
  const [annotateMode, setAnnotateMode] = useState(false);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const stroke of [...strokesRef.current, ...(currentStrokeRef.current ? [currentStrokeRef.current] : [])]) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.erase ? "rgba(0,0,0,0)" : stroke.color;
      ctx.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
      ctx.lineWidth = stroke.width;
      ctx.moveTo(stroke.points[0]!.x * rect.width, stroke.points[0]!.y * rect.height);
      for (let i = 1; i < stroke.points.length; i += 1) {
        const p = stroke.points[i]!;
        ctx.lineTo(p.x * rect.width, p.y * rect.height);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }, []);

  const persist = useCallback(() => {
    try {
      sessionStorage.setItem(storageKey(documentId), JSON.stringify(strokesRef.current));
    } catch {
      // ignore quota
    }
  }, [documentId]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey(documentId));
      if (raw) strokesRef.current = JSON.parse(raw) as Stroke[];
    } catch {
      strokesRef.current = [];
    }
    redraw();
  }, [documentId, imageUrl, redraw]);

  useEffect(() => {
    toolRef.current = tool;
    colorRef.current = color;
  }, [tool, color]);

  useEffect(() => {
    const ro = new ResizeObserver(() => redraw());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  const pointerPos = (e: React.PointerEvent<HTMLCanvasElement>): Point | null => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!annotateMode) return;
    const p = pointerPos(e);
    if (!p) return;
    drawingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    currentStrokeRef.current = {
      points: [p],
      color: colorRef.current,
      width: toolRef.current === "eraser" ? 18 : 3,
      erase: toolRef.current === "eraser",
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    const p = pointerPos(e);
    if (!p) return;
    currentStrokeRef.current.points.push(p);
    redraw();
  };

  const endStroke = () => {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    drawingRef.current = false;
    strokesRef.current.push(currentStrokeRef.current);
    currentStrokeRef.current = null;
    persist();
    redraw();
  };

  const clearAll = () => {
    strokesRef.current = [];
    persist();
    redraw();
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={annotateMode ? "secondary" : "ghost"}
          className="gap-1.5"
          onClick={() => setAnnotateMode((v) => !v)}
        >
          <Pencil className="h-3.5 w-3.5" />
          {annotateMode ? "Anotar on" : "Anotar apunte"}
        </Button>
        {annotateMode ? (
          <>
            <Button type="button" size="sm" variant={tool === "pen" ? "secondary" : "ghost"} onClick={() => setTool("pen")}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="sm" variant={tool === "eraser" ? "secondary" : "ghost"} onClick={() => setTool("eraser")}>
              <Eraser className="h-3.5 w-3.5" />
            </Button>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  "h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-slate-900",
                  color === c ? "ring-white" : "ring-transparent",
                )}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label="Color"
              />
            ))}
            <Button type="button" size="sm" variant="ghost" onClick={clearAll}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : null}
      </div>

      <div ref={containerRef} className="relative overflow-hidden rounded-xl border border-white/15 bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Apunte" className="max-h-[min(42vh,480px)] w-full object-contain" draggable={false} />
        <canvas
          ref={canvasRef}
          className={cn(
            "absolute inset-0 h-full w-full touch-none",
            annotateMode ? "cursor-crosshair" : "pointer-events-none",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
        />
      </div>
    </div>
  );
}
