import type { Metadata } from "next";
import { Suspense } from "react";

import { FamilyReport } from "@/components/study/family-report";

export const metadata: Metadata = { title: "Reporte para mi familia" };

export default function FamilyReportPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <FamilyReport />
    </Suspense>
  );
}
