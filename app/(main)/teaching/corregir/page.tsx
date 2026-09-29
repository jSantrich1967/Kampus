import type { Metadata } from "next";
import { Suspense } from "react";

import { AutoGrader } from "@/components/teaching/auto-grader";

export const metadata: Metadata = { title: "Corrección automática" };

export default function AutoGraderPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <AutoGrader />
    </Suspense>
  );
}
