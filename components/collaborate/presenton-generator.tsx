"use client";

import { Download, Loader2, MonitorPlay, PencilLine } from "lucide-react";
import { useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isPresentonPilotEnabled } from "@/lib/presenton/flag";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { UserNotebookRow } from "@/lib/notebooks/types";

type GenerateSuccess = {
  presentationId: string;
  downloadUrl: string;
  editUrl: string;
  exportAs: "pptx" | "pdf";
};

const SLIDE_OPTIONS = [5, 8, 10, 12] as const;

/**
 * Piloto Presenton: genera una presentación (PPTX/PDF) desde el cuaderno del
 * propio estudiante/profesor usando el servicio Presenton autoalojado.
 * Apagado por defecto: sin la flag pública no renderiza nada.
 */
export function PresentonGenerator() {
  if (!isPresentonPilotEnabled()) return null;
  return <PresentonGeneratorInner />;
}

function PresentonGeneratorInner() {
  const { authUserId } = useKampus();
  const [notebooks, setNotebooks] = useState<UserNotebookRow[]>([]);
  const [loadingNotebooks, setLoadingNotebooks] = useState(false);
  const [subject, setSubject] = useState("");
  const [nSlides, setNSlides] = useState<number>(8);
  const [exportAs, setExportAs] = useState<"pptx" | "pdf">("pptx");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [result, setResult] = useState<GenerateSuccess | null>(null);

  useEffect(() => {
    if (!authUserId || !isSupabaseConfigured()) return;
    let cancelled = false;
    setLoadingNotebooks(true);
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error: loadError } = await supabase
          .from("user_notebooks")
          .select("*")
          .eq("user_id", authUserId)
          .order("subject", { ascending: true });
        if (cancelled) return;
        if (loadError) throw loadError;
        const rows = (data as UserNotebookRow[]) ?? [];
        setNotebooks(rows);
        if (rows.length > 0) setSubject((prev) => prev || rows[0].subject);
      } catch {
        if (!cancelled) setError("No pudimos cargar tus cuadernos. Recarga la página e inténtalo de nuevo.");
      } finally {
        if (!cancelled) setLoadingNotebooks(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  async function handleGenerate() {
    if (!subject || generating) return;
    setGenerating(true);
    setError(null);
    setNotConfigured(false);
    setResult(null);
    try {
      const res = await fetch("/api/presenton/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, nSlides, exportAs }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (res.status === 503) {
        setNotConfigured(true);
        return;
      }
      if (!res.ok) {
        const message =
          data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : "No pudimos generar la presentación.";
        setError(message);
        return;
      }
      setResult(data as GenerateSuccess);
    } catch {
      setError("No pudimos contactar el servidor de Kampus. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MonitorPlay className="h-5 w-5" aria-hidden />
          Generar presentación desde mi cuaderno
        </CardTitle>
        <CardDescription>
          Convertimos el material de <strong>tu propio cuaderno</strong> en diapositivas listas para tu
          exposición. Presenton organiza lo que ya estudiaste: no inventa contenido por ti, así que revisa y
          ajusta el resultado antes de presentar.
        </CardDescription>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6">
        {!authUserId ? (
          <p className="text-sm text-slate-400">Inicia sesión para generar una presentación desde tu cuaderno.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-300">Cuaderno</span>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={loadingNotebooks || notebooks.length === 0}
                  className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm"
                >
                  {notebooks.length === 0 ? (
                    <option value="">{loadingNotebooks ? "Cargando…" : "Sin cuadernos"}</option>
                  ) : (
                    notebooks.map((nb) => (
                      <option key={nb.id} value={nb.subject}>
                        {nb.subject}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-300">Diapositivas</span>
                <select
                  value={nSlides}
                  onChange={(e) => setNSlides(Number(e.target.value))}
                  className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm"
                >
                  {SLIDE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} diapositivas
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-300">Formato</span>
                <select
                  value={exportAs}
                  onChange={(e) => setExportAs(e.target.value as "pptx" | "pdf")}
                  className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm"
                >
                  <option value="pptx">PPTX editable</option>
                  <option value="pdf">PDF</option>
                </select>
              </label>
            </div>

            <Button onClick={handleGenerate} disabled={generating || !subject}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Generando tu presentación…
                </>
              ) : (
                "Generar presentación"
              )}
            </Button>
            {generating ? (
              <p className="text-sm text-slate-400">
                Esto puede tardar uno o dos minutos: Presenton está armando y exportando tus diapositivas.
              </p>
            ) : null}

            {notConfigured ? (
              <p className="rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
                El servicio de presentaciones todavía no está configurado en este entorno. La función existe,
                pero falta conectar el servidor de Presenton; avísanos y lo activamos.
              </p>
            ) : null}
            {error ? (
              <p className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</p>
            ) : null}

            {result ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <a href={result.downloadUrl} className={buttonClasses({})} target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4" aria-hidden />
                  Descargar {result.exportAs.toUpperCase()}
                </a>
                <a href={result.editUrl} className={buttonClasses({ variant: "secondary" })} target="_blank" rel="noreferrer">
                  <PencilLine className="mr-2 h-4 w-4" aria-hidden />
                  Abrir en el editor de Presenton
                </a>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Card>
  );
}
