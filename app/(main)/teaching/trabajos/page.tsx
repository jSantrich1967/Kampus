import type { Metadata } from "next";
import { Suspense } from "react";

import { ReviewWorks } from "@/components/teaching/review-works";

export const metadata: Metadata = { title: "Revisar trabajos" };

export default function ReviewWorksPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <ReviewWorks />
    </Suspense>
  );
}
