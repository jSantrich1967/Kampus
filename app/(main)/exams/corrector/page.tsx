import type { Metadata } from "next";
import { Suspense } from "react";

import { ExamCorrector } from "@/components/exams/exam-corrector";

export const metadata: Metadata = { title: "Corregir exámenes con IA" };

export default function ExamCorrectorPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <ExamCorrector />
    </Suspense>
  );
}
