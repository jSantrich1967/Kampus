"use client";

import { AlertTriangle, CheckCircle2, Flame, Loader2, BellRing, FileText } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  getTeacherAlerts,
  type RiskLevel,
  type StudentAlertWithRisk,
} from "@/lib/supabase/teacher-alerts-db";
import { cn } from "@/lib/cn";

const RISK_STYLE: Record<RiskLevel, { badge: string; border: string; label: string }> = {
  high: { badge: "bg-rose-500/15 text-rose-200 border-rose-400/30", border: "border-rose-400/25", label: "Atención" },
  medium: { badge: "bg-amber-500/15 text-amber-200 border-amber-400/30", border: "border-amber-400/25", label: "Seguimiento" },
  ok: { badge: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30", border: "border-emerald-400/20", label: "Va bien" },
};

export function TeacherAlerts() {
  const { authUserId, profile } = useKampus();

  const [alerts, setAlerts] = useState<StudentAlertWithRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!authUserId || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      const supabase = createSupabaseBrowserClient();
      setAlerts(await getTeacherAlerts(supabase));
    } catch {
      setError("No se pudieron cargar las alertas.");
    } finally {
      setLoading(false);
    }
  }, [authUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    return {
      high: alerts.filter((a) => a.risk === "high").length,
      medium: alerts.filter((a) => a.risk === "medium").length,
      ok: alerts.filter((a) => a.risk === "ok").length,
    };
  }, [alerts]);

  if (profile.role !== "teacher") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Docencia"
          title="Alertas de estudiantes"
          description="Esta herramienta es para docentes. Cambia tu rol a docente en ajustes."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Docencia"
        title="Alertas de estudiantes"
        description="Quién necesita tu atención esta semana: inactividad, trabajos pendientes y promedios en riesgo."
      />

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {loading ? (
        <Card className="border-white/10">
          <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Analizando a tus estudiantes…
          </div>
        </Card>
      ) : alerts.length === 0 ? (
        <Card className="border-dashed border-white/15">
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <BellRing className="h-8 w-8 text-slate-500" />
            <p className="text-sm text-slate-400">
              Aún no hay datos. Cuando tus estudiantes te envíen trabajos y estudien en Kampus, verás aquí sus alertas.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-rose-400/25 bg-rose-500/5">
              <div className="px-4 py-3 text-center">
                <p className="text-2xl font-bold text-rose-200">{counts.high}</p>
                <p className="text-[11px] text-slate-400">necesitan atención</p>
              </div>
            </Card>
            <Card className="border-amber-400/25 bg-amber-500/5">
              <div className="px-4 py-3 text-center">
                <p className="text-2xl font-bold text-amber-200">{counts.medium}</p>
                <p className="text-[11px] text-slate-400">en seguimiento</p>
              </div>
            </Card>
            <Card className="border-emerald-400/20 bg-emerald-500/5">
              <div className="px-4 py-3 text-center">
                <p className="text-2xl font-bold text-emerald-200">{counts.ok}</p>
                <p className="text-[11px] text-slate-400">van bien</p>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {alerts.map((a) => {
              const style = RISK_STYLE[a.risk];
              return (
                <Card key={a.studentId} className={cn(style.border)}>
                  <div className="space-y-3 px-6 py-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white">{a.studentName}</p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Flame className="h-3.5 w-3.5" />
                            {a.weekDays}/7 días esta semana
                          </span>
                          {a.pendingWorks > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <FileText className="h-3.5 w-3.5" />
                              {a.pendingWorks} por corregir
                            </span>
                          ) : null}
                          {a.avg30d != null ? <span>Promedio {a.avg30d}/20</span> : null}
                        </div>
                      </div>
                      <Badge tone="neutral" className={style.badge}>
                        {a.risk === "high" ? (
                          <AlertTriangle className="mr-1 h-3 w-3" />
                        ) : a.risk === "medium" ? (
                          <BellRing className="mr-1 h-3 w-3" />
                        ) : (
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                        )}
                        {style.label}
                      </Badge>
                    </div>
                    <ul className="space-y-1">
                      {a.signals.map((s, i) => (
                        <li key={i} className="text-sm text-slate-300">
                          • {s}
                        </li>
                      ))}
                    </ul>
                    <Link href="/teaching/reportes">
                      <Button type="button" size="sm" variant="secondary">
                        Ver reporte semanal
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
