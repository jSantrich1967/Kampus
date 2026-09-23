"use client";

import { Loader2, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WeeklyReportCard } from "@/components/reports/weekly-report-card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { listWorksForReview, type StudentWork } from "@/lib/supabase/teacher-student-db";
import { getWeeklyReport, type WeeklyReport } from "@/lib/supabase/weekly-report-db";
import { cn } from "@/lib/cn";

export function TeacherReports() {
  const { authUserId, profile } = useKampus();

  const [works, setWorks] = useState<StudentWork[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");

  const loadStudents = useCallback(async () => {
    if (!authUserId || !isSupabaseConfigured()) {
      setLoadingStudents(false);
      return;
    }
    try {
      const supabase = createSupabaseBrowserClient();
      setWorks(await listWorksForReview(supabase));
    } catch {
      setError("No se pudieron cargar tus estudiantes.");
    } finally {
      setLoadingStudents(false);
    }
  }, [authUserId]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const students = useMemo(() => {
    const map = new Map<string, { id: string; name: string; works: number }>();
    for (const w of works) {
      const entry = map.get(w.studentUserId) ?? { id: w.studentUserId, name: w.studentDisplayName, works: 0 };
      entry.works += 1;
      if (w.studentDisplayName && entry.name === "Estudiante") entry.name = w.studentDisplayName;
      map.set(w.studentUserId, entry);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [works]);

  async function handleSelect(studentId: string) {
    setSelectedId(studentId);
    setReport(null);
    setError("");
    if (!isSupabaseConfigured()) return;
    setLoadingReport(true);
    try {
      const supabase = createSupabaseBrowserClient();
      setReport(await getWeeklyReport(supabase, studentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el reporte.");
    } finally {
      setLoadingReport(false);
    }
  }

  if (profile.role !== "teacher") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Docencia"
          title="Reportes para familias"
          description="Esta herramienta es para docentes. Cambia tu rol a docente en ajustes."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Docencia"
        title="Reportes para familias"
        description="Genera el resumen semanal de cada estudiante y envíaselo a su representante por WhatsApp con un toque."
      />

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="border-white/10 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Mis estudiantes</CardTitle>
            <CardDescription>Quienes te han enviado trabajos.</CardDescription>
          </CardHeader>
          <div className="space-y-2 px-6 pb-6">
            {loadingStudents ? (
              <p className="text-sm text-slate-400">Cargando…</p>
            ) : students.length === 0 ? (
              <p className="text-sm text-slate-400">
                Aún ningún estudiante te ha enviado trabajos. Cuando lo hagan, aparecerán aquí.
              </p>
            ) : (
              students.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => void handleSelect(s.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition",
                    selectedId === s.id
                      ? "border-indigo-400/50 bg-indigo-500/10"
                      : "border-white/10 bg-black/20 hover:border-white/20",
                  )}
                >
                  <span>
                    <span className="block text-sm font-medium text-white">{s.name}</span>
                    <span className="block text-xs text-slate-500">
                      {s.works} {s.works === 1 ? "trabajo" : "trabajos"}
                    </span>
                  </span>
                  <Send className="h-4 w-4 shrink-0 text-slate-500" />
                </button>
              ))
            )}
          </div>
        </Card>

        <div className="lg:col-span-3">
          {!selectedId ? (
            <Card className="border-dashed border-white/15">
              <div className="px-6 py-14 text-center text-sm text-slate-400">
                Elige un estudiante para generar su reporte semanal.
              </div>
            </Card>
          ) : loadingReport ? (
            <Card className="border-white/10">
              <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Generando reporte…
              </div>
            </Card>
          ) : report ? (
            <WeeklyReportCard report={report} />
          ) : (
            <Card className="border-white/10">
              <div className="px-6 py-14 text-center">
                <Button type="button" onClick={() => void handleSelect(selectedId)}>
                  Reintentar
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
