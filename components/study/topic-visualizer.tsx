"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FlaskConical, Loader2, Maximize2, Minimize2, RotateCcw, X } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type VisualizerProps = {
  /** Materia del estudiante (p. ej. "Biología"). */
  subject: string;
  /** Tema precargado en el modal (p. ej. línea de asunto del kit). */
  defaultTopic?: string;
  /** 1-2 líneas del material del estudiante para contextualizar. */
  context?: string;
  /** Texto del botón disparador. */
  label?: string;
  size?: "sm" | "md";
};

/**
 * Botón "Simular" + modal con la simulación interactiva generada por IA.
 * El HTML se renderiza en un iframe con sandbox="allow-scripts" (SIN
 * allow-same-origin): el JS generado no puede tocar la app.
 */
export function TopicVisualizer({ subject, defaultTopic, context, label = "Simular", size = "sm" }: VisualizerProps) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState(defaultTopic ?? "");
  const [html, setHtml] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Si cambia la materia/tema por defecto, precarga el input.
  useEffect(() => {
    setTopic(defaultTopic ?? "");
  }, [defaultTopic]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const close = useCallback(() => {
    abortRef.current?.abort();
    setOpen(false);
    setBusy(false);
    setFullscreen(false);
  }, []);

  // Cerrar con Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const generate = useCallback(async () => {
    const trimmedTopic = topic.trim();
    if (!trimmedTopic || busy) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    setErrorCode(null);
    setHtml(null);
    try {
      // Generar hasta ~5000 tokens puede tardar; nunca colgar la UI.
      const timeout = setTimeout(() => controller.abort(), 100_000);
      const res = await fetch("/api/visualize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim() || "General",
          topic: trimmedTopic,
          context: (context ?? "").trim().slice(0, 500),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const json = (await res.json().catch(() => ({}))) as { html?: string; cached?: boolean; error?: string; code?: string };
      if (!res.ok) {
        setErrorCode(json.code ?? null);
        throw new Error(json.error || `No pudimos generar la simulación (error ${res.status}).`);
      }
      if (!json.html) throw new Error("La respuesta llegó vacía. Inténtalo de nuevo.");
      setHtml(json.html);
      setCached(Boolean(json.cached));
    } catch (e) {
      const msg =
        e instanceof Error && e.name === "AbortError"
          ? "La generación tardó demasiado y la cortamos. Inténtalo de nuevo."
          : e instanceof Error
            ? e.message
            : "No pudimos generar la simulación. Inténtalo de nuevo.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }, [topic, busy, subject, context]);

  const openModal = useCallback(() => {
    setError(null);
    setErrorCode(null);
    setHtml(null);
    setOpen(true);
  }, []);

  return (
    <>
      <Button type="button" size={size} variant="secondary" onClick={openModal} className="gap-1.5">
        <FlaskConical className="h-4 w-4" aria-hidden />
        {label}
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Simulación de ${topic || "tema"}`}
          onClick={close}
        >
          <div
            className={
              fullscreen
                ? "flex h-full w-full flex-col overflow-hidden rounded-2xl bg-slate-950 shadow-2xl"
                : "flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-slate-950 shadow-2xl"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 sm:px-6">
              <FlaskConical className="h-4 w-4 shrink-0 text-indigo-300" aria-hidden />
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                Simulación{topic.trim() ? `: ${topic.trim()}` : ""}
              </p>
              {cached ? (
                <span className="hidden rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-300 sm:inline">
                  Instantánea
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setFullscreen((v) => !v)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
                aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
              >
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
                aria-label="Cerrar simulación"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!html && !busy ? (
              <div className="space-y-4 px-4 py-6 sm:px-6">
                <div>
                  <label htmlFor="visualize-topic" className="mb-1 block text-xs font-medium text-slate-300">
                    Tema a simular
                  </label>
                  <input
                    id="visualize-topic"
                    className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                    value={topic}
                    maxLength={120}
                    placeholder="Ej. Fotosíntesis, bomba sodio-potasio, función cuadrática…"
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void generate();
                    }}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Materia: {subject.trim() || "General"}. La IA arma un diagrama o animación interactiva en español.
                  </p>
                </div>
                {error ? (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    <p>{error}</p>
                    {errorCode === "VISUALIZE_EXHAUSTED" ? (
                      <p className="mt-2">
                        <Link href="/pro" className="font-semibold underline underline-offset-2">
                          Pasarme a Pro ($5/mes)
                        </Link>{" "}
                        para simulaciones ilimitadas.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void generate()} disabled={!topic.trim()} className="gap-2">
                    <FlaskConical className="h-4 w-4" />
                    Generar simulación
                  </Button>
                  {error ? (
                    <Button type="button" variant="secondary" onClick={() => void generate()} disabled={!topic.trim()} className="gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Reintentar
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {busy ? (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-300" aria-hidden />
                <p className="text-sm font-medium text-white">Armando tu simulación…</p>
                <p className="max-w-sm text-xs text-slate-400">
                  La IA está construyendo un diagrama interactivo de “{topic.trim()}”. Suele tardar menos de un minuto.
                </p>
              </div>
            ) : null}

            {html && !busy ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <iframe
                  title={`Simulación interactiva: ${topic.trim()}`}
                  sandbox="allow-scripts"
                  srcDoc={html}
                  className="min-h-[60vh] w-full flex-1 bg-white"
                />
                <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-4 py-3 sm:px-6">
                  <p className="mr-auto text-xs text-slate-500">
                    Simulación generada por IA con fines educativos. Verifica los datos con tu material de clase.
                  </p>
                  <Button type="button" variant="secondary" size="sm" onClick={() => void generate()} className="gap-1.5">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Regenerar
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
