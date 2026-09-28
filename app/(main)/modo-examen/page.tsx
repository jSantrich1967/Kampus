import type { Metadata } from "next";
import { Suspense } from "react";

import { CramMode } from "@/components/cram/cram-mode";

export const metadata: Metadata = { title: "Modo examen" };

export default function CramModePage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <CramMode />
    </Suspense>
  );
}
