import type { Metadata } from "next";
import { Suspense } from "react";

import { AdaptivePlanner } from "@/components/study/adaptive-planner";

export const metadata: Metadata = { title: "Mi plan de estudio" };

export default function StudyPlanPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <AdaptivePlanner />
    </Suspense>
  );
}
