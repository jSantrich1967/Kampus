import type { Metadata } from "next";
import { Suspense } from "react";

import { DiaryHub } from "@/components/wellbeing/diary-hub";

export const metadata: Metadata = { title: "Mi Diario" };

export default function DiaryPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <DiaryHub />
    </Suspense>
  );
}
