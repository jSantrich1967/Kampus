import type { Metadata } from "next";
import { Suspense } from "react";

import { SelfExamCorrector } from "@/components/exams/self-exam-corrector";

export const metadata: Metadata = { title: "Mi corrección con IA" };

export default function SelfExamCorrectorPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <SelfExamCorrector />
    </Suspense>
  );
}
