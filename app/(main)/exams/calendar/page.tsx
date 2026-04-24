import type { Metadata } from "next";
import { Suspense } from "react";

import { AcademicCalendarHub } from "@/components/exams/academic-calendar-hub";

export const metadata: Metadata = { title: "Mi calendario académico" };

export default function ExamsCalendarPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <AcademicCalendarHub />
    </Suspense>
  );
}
