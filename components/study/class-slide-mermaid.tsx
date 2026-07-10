"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/cn";

type Props = {
  code: string;
  className?: string;
};

/** Sanitize: only allow common mermaid diagram types. */
function sanitizeMermaid(code: string): string | null {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const allowed = /^(flowchart|graph|mindmap|timeline|sequenceDiagram|classDiagram|pie|gitGraph)/i;
  if (!allowed.test(trimmed)) return null;
  if (trimmed.length > 2000) return trimmed.slice(0, 2000);
  return trimmed;
}

export function ClassSlideMermaid({ code, className }: Props) {
  const reactId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    const safe = sanitizeMermaid(code);
    if (!safe) {
      setSvg(null);
      setError("Diagrama no válido.");
      setBusy(false);
      return;
    }

    let cancelled = false;
    setBusy(true);
    setError(null);

    void (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "strict",
          fontFamily: "inherit",
        });
        const id = `kampus-mmd-${reactId}`;
        const { svg: rendered } = await mermaid.render(id, safe);
        if (!cancelled) {
          setSvg(rendered);
          setBusy(false);
        }
      } catch {
        if (!cancelled) {
          setSvg(null);
          setError("No se pudo dibujar el diagrama.");
          setBusy(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, reactId]);

  if (busy) {
    return (
      <div className={cn("flex items-center justify-center gap-2 py-8 text-sm text-slate-400", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Dibujando diagrama…
      </div>
    );
  }

  if (error || !svg) {
    return <p className={cn("text-center text-xs text-slate-500", className)}>{error ?? "Sin diagrama."}</p>;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/60 p-4 [&_svg]:mx-auto [&_svg]:max-h-72 [&_svg]:w-full",
        className,
      )}
      // eslint-disable-next-line react/no-danger -- trusted mermaid SVG from our sanitized input
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
