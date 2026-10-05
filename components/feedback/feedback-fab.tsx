"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Lightbulb, Loader2, X } from "lucide-react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";

/** Nombre amable de la sección según la ruta. */
function sectionLabel(pathname: string): string {
  if (pathname.startsWith("/tutor")) return "Tutor IA";
  if (pathname.startsWith("/duelos")) return "Duelos";
  if (pathname.startsWith("/modo-examen")) return "Modo examen";
  if (pathname.startsWith("/study/library")) return "Biblioteca";
  if (pathname.startsWith("/study/plan")) return "Mi plan";
  if (pathname.startsWith("/study/convertir")) return "Convertir material";
  if (pathname.startsWith("/study")) return "Estudio";
  if (pathname.startsWith("/collaborate/aula-virtual")) return "Aula virtual";
  if (pathname.startsWith("/collaborate")) return "Colaborar";
  if (pathname.startsWith("/teaching")) return "Espacio docente";
  if (pathname.startsWith("/today")) return "Hoy";
  if (pathname.startsWith("/settings") || pathname.startsWith("/ajustes")) return "Ajustes";
  return "General";
}

const CATEGORIES = [
  { value: "sugerencia", label: "Sugerencia" },
  { value: "mejora", label: "Mejora" },
  { value: "error", label: "Reportar un error" },
  { value: "otro", label: "Otro" },
] as const;

export function FeedbackFab() {
  const pathname = usePathname();
  const { authUserId } = useKampus();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("sugerencia");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // No mostrar en login/registro/onboarding/landing.
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/demo") ||
    pathname.startsWith("/auth/")
  ) {
    return null;
  }

  function close() {
    setOpen(false);
    setError(null);
    setSent(false);
    setMessage("");
    setCategory("sugerencia");
  }

  async function submit() {
    const text = message.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message: text, page: sectionLabel(pathname) }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "No se pudo enviar.");
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Sugerir una mejora"
        title="Sugerir una mejora"
        className="fixed bottom-20 right-4 z-[70] flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-950/50 transition hover:bg-indigo-500 md:bottom-6 md:right-6"
      >
        <Lightbulb className="h-5 w-5" aria-hidden />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[110] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Sugerir una mejora">
          <button type="button" aria-label="Cerrar" onClick={close} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <button type="button" onClick={close} aria-label="Cerrar" className="absolute right-4 top-4 text-slate-500 hover:text-white">
              <X className="h-5 w-5" aria-hidden />
            </button>

            {sent ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" aria-hidden />
                <p className="mt-3 font-medium text-white">¡Gracias por tu observación!</p>
                <p className="mt-1 text-sm text-slate-400">La revisaremos para seguir mejorando Kampus.</p>
                <Button type="button" className="mt-5" onClick={close}>
                  Cerrar
                </Button>
              </div>
            ) : authUserId ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Sugerir una mejora</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Sección: <span className="font-medium text-indigo-300">{sectionLabel(pathname)}</span>
                  </p>
                </div>
                <label className="block text-sm text-slate-300">
                  Tipo
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-slate-300">
                  Tu observación
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder="Cuéntanos qué mejorarías o qué error viste…"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                  />
                </label>
                {error ? <p className="text-sm text-rose-300">{error}</p> : null}
                <Button type="button" className="w-full" disabled={busy || !message.trim()} onClick={submit}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  Enviar observación
                </Button>
              </div>
            ) : (
              <div className="py-4 text-center">
                <Lightbulb className="mx-auto h-10 w-10 text-indigo-300/70" aria-hidden />
                <p className="mt-3 font-medium text-white">Sugerir una mejora</p>
                <p className="mt-1 text-sm text-slate-400">
                  Inicia sesión para enviarnos tus observaciones y ayudar a mejorar Kampus.
                </p>
                <Button type="button" className="mt-5" onClick={() => (window.location.href = "/login")}>
                  Ir a entrar
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
