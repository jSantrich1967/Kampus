import type { Metadata } from "next";
import { Suspense } from "react";

import { CramModeGate } from "@/components/cram/cram-mode-gate";

export const metadata: Metadata = { title: "Modo examen" };

export default function CramModePage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <CramModeGate />
    </Suspense>
  );
}
