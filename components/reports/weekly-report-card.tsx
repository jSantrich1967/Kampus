"use client";

import { MessageCircle, Flame, CalendarDays, FileText, CheckCircle2, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { weeklyReportText, weeklyReportWhatsappUrl, type WeeklyReport } from "@/lib/supabase/weekly-report-db";

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <span className="text-indigo-300">{icon}</span>
      <div>
        <p className="text-lg font-bold text-white">{value}</p>
        <p className="text-[11px] text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export function WeeklyReportCard({ report }: { report: WeeklyReport }) {
  const waUrl = weeklyReportWhatsappUrl(report);
  return (
    <Card className="border-white/10">
      <div className="space-y-5 px-6 py-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">Reporte semanal</p>
          <h3 className="mt-1 text-xl font-bold text-white">{report.studentName}</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat icon={<Flame className="h-5 w-5" />} value={`${report.streak}`} label={report.streak === 1 ? "día de racha" : "días de racha"} />
          <Stat icon={<CalendarDays className="h-5 w-5" />} value={`${report.studyDays}/7`} label="días que estudió" />
          <Stat icon={<FileText className="h-5 w-5" />} value={`${report.submitted}`} label="trabajos enviados" />
          <Stat icon={<CheckCircle2 className="h-5 w-5" />} value={`${report.reviewed}`} label="trabajos corregidos" />
          <Stat
            icon={<Star className="h-5 w-5" />}
            value={report.avgGrade != null ? `${report.avgGrade}/20` : "—"}
            label="promedio semanal"
          />
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
          <p className="text-xs font-medium text-slate-400">Vista previa del mensaje</p>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{weeklyReportText(report)}</pre>
        </div>
        <a href={waUrl} target="_blank" rel="noreferrer">
          <Button type="button" className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500">
            <MessageCircle className="h-4 w-4" />
            Enviar a la familia por WhatsApp
          </Button>
        </a>
        <p className="text-xs text-slate-500">
          Se abre WhatsApp con el mensaje listo. Elige el contacto del representante y envíalo.
        </p>
      </div>
    </Card>
  );
}
