import type { Metadata } from "next";
import { Suspense } from "react";

import { ExposicionesEntry } from "@/components/collaborate/exposiciones-entry";

export const metadata: Metadata = { title: "Exposiciones" };

export default function ExposicionesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <ExposicionesEntry />
    </Suspense>
  );
}
