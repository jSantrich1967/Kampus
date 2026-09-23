import type { Metadata } from "next";
import { Suspense } from "react";

import { TeacherReports } from "@/components/teaching/teacher-reports";

export const metadata: Metadata = { title: "Reportes para familias" };

export default function TeacherReportsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <TeacherReports />
    </Suspense>
  );
}
