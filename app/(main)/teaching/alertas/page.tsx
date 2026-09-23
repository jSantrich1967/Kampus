import type { Metadata } from "next";
import { Suspense } from "react";

import { TeacherAlerts } from "@/components/teaching/teacher-alerts";

export const metadata: Metadata = { title: "Alertas de estudiantes" };

export default function TeacherAlertsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <TeacherAlerts />
    </Suspense>
  );
}
