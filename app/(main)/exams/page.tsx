import type { Metadata } from "next";
import { Suspense } from "react";

import { ExamsEntry } from "@/components/exams/exams-entry";

export const metadata: Metadata = { title: "Exámenes" };

export default function ExamsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <ExamsEntry />
    </Suspense>
  );
}
