import type { Metadata } from "next";
import { Suspense } from "react";

import { ExamsHub } from "@/components/exams/exams-hub";

export const metadata: Metadata = { title: "Exámenes" };

export default function ExamsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <ExamsHub />
    </Suspense>
  );
}
