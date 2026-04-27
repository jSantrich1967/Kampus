import type { Metadata } from "next";
import { Suspense } from "react";

import { PresentationPlanner } from "@/components/collaborate/presentation-planner";

export const metadata: Metadata = { title: "Mis exposiciones" };

export default function MisExposicionesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <PresentationPlanner />
    </Suspense>
  );
}
