import type { Metadata } from "next";
import { Suspense } from "react";

import { MaterialConverter } from "@/components/study/material-converter";

export const metadata: Metadata = { title: "Convertir material en cuaderno" };

export default function ConvertMaterialPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <MaterialConverter />
    </Suspense>
  );
}
