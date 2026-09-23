import type { Metadata } from "next";
import { Suspense } from "react";

import { ExamGeneratorWorkspace } from "@/components/teaching/exam-generator-workspace";

export const metadata: Metadata = { title: "Generador de exámenes" };

export default function ExamGeneratorPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <ExamGeneratorWorkspace />
    </Suspense>
  );
}
