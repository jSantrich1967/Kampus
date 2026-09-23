"use client";

import { Loader2, Users } from "lucide-react";
import { useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WeeklyReportCard } from "@/components/reports/weekly-report-card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getWeeklyReport, type WeeklyReport } from "@/lib/supabase/weekly-report-db";

export function FamilyReport() {
  const { authUserId } = useKampus();

  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!authUserId || !isSupabaseConfigured()) {
      setError("Inicia sesión para ver tu reporte.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      setReport(await getWeeklyReport(supabase, authUserId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el reporte.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Estudio"
        title="Reporte para mi familia"
        description="Genera tu resumen semanal y compártelo con tu representante por WhatsApp: racha, días de estudio, trabajos y promedio."
      />

      {!report ? (
        <Card className="border-white/10">
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <Users className="h-10 w-10 text-slate-500" />
            <CardHeader className="p-0">
              <CardTitle className="text-base">Tu semana en un mensaje</CardTitle>
              <CardDescription>
                Muéstrale a tu familia cómo vas: un solo mensaje con todo tu progreso.
              </CardDescription>
            </CardHeader>
            <Button type="button" onClick={() => void handleGenerate()} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Generando…" : "Generar mi reporte semanal"}
            </Button>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </div>
        </Card>
      ) : (
        <WeeklyReportCard report={report} />
      )}
    </div>
  );
}
