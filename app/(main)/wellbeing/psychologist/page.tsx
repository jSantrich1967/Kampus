import type { Metadata } from "next";
import { Suspense } from "react";

import { PsychologistHub } from "@/components/wellbeing/psychologist-hub";

export const metadata: Metadata = { title: "Apoyo emocional" };

export default function PsychologistPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <PsychologistHub />
    </Suspense>
  );
}
