"use client";

import { CloudSync } from "lucide-react";

type LibraryCloudSyncWidgetProps = {
  documentCount: number;
  synced: boolean;
};

export function LibraryCloudSyncWidget({ documentCount, synced }: LibraryCloudSyncWidgetProps) {
  return (
    <div className="kampus-lumina-glass-card flex flex-col items-center gap-12 rounded-[40px] bg-gradient-to-r from-purple-900/10 to-transparent p-8 md:flex-row">
      <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
        <div className="text-center">
          <p className="text-3xl font-bold text-white">{documentCount}</p>
          <p className="text-[8px] tracking-widest text-gray-500 uppercase">
            {documentCount === 1 ? "Documento" : "Documentos"}
          </p>
        </div>
      </div>

      <div className="flex-1 text-center md:text-left">
        <div className="mb-4 flex items-center justify-center gap-3 md:justify-start">
          <CloudSync className="h-6 w-6 text-purple-400" />
          <h3 className="text-2xl font-bold text-white">Sincronización en la Nube</h3>
        </div>
        <p className="max-w-xl leading-relaxed text-gray-400">
          {synced
            ? "Se guarda en tu cuenta y se sincroniza entre dispositivos. Si te quedas sin conexión, sigues trabajando en este dispositivo y todo se sube en cuanto vuelva el internet."
            : "Inicia sesión para guardar tus cuadernos en tu cuenta y acceder desde cualquier dispositivo."}
        </p>
      </div>
    </div>
  );
}
