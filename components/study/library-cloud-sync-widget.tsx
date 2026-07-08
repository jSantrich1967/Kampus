"use client";

import { CloudSync } from "lucide-react";

import { cloudUsagePercent } from "@/lib/study/library-lumina";

type LibraryCloudSyncWidgetProps = {
  documentCount: number;
  synced: boolean;
};

export function LibraryCloudSyncWidget({ documentCount, synced }: LibraryCloudSyncWidgetProps) {
  const usage = cloudUsagePercent(documentCount);
  const circumference = 440;
  const offset = circumference - (circumference * usage) / 100;

  return (
    <div className="kampus-lumina-glass-card flex flex-col items-center gap-12 rounded-[40px] bg-gradient-to-r from-purple-900/10 to-transparent p-8 md:flex-row">
      <div className="relative flex h-40 w-40 items-center justify-center">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 160 160" aria-hidden>
          <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
          <circle
            cx="80"
            cy="80"
            r="70"
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="text-purple-500"
          />
        </svg>
        <div className="absolute text-center">
          <p className="text-3xl font-bold text-white">{usage}%</p>
          <p className="text-[8px] tracking-widest text-gray-500 uppercase">Uso Cloud</p>
        </div>
      </div>

      <div className="flex-1 text-center md:text-left">
        <div className="mb-4 flex items-center justify-center gap-3 md:justify-start">
          <CloudSync className="h-6 w-6 text-purple-400" />
          <h3 className="text-2xl font-bold text-white">Sincronización en la Nube</h3>
        </div>
        <p className="mb-8 max-w-xl leading-relaxed text-gray-400">
          {synced
            ? "Todos tus cuadernos se están sincronizando con Kampus Lumina Cloud. No pierdas nunca tu progreso, incluso sin conexión."
            : "Inicia sesión para sincronizar tus cuadernos en la nube y acceder desde cualquier dispositivo."}
        </p>
        <div className="flex flex-wrap justify-center gap-4 md:justify-start">
          <button
            type="button"
            className="rounded-xl border border-purple-500/20 bg-purple-600/20 px-6 py-3 text-sm font-bold text-purple-300 transition-all hover:bg-purple-600/30"
          >
            Ver historial
          </button>
          <button
            type="button"
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/10"
          >
            Configurar backup
          </button>
        </div>
      </div>
    </div>
  );
}
