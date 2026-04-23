import type { Metadata } from "next";
import { Suspense } from "react";

import { TeacherCopilotWorkspace } from "@/components/teaching/teacher-copilot-workspace";

export const metadata: Metadata = { title: "Copiloto docente" };

export default function TeachingPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <TeacherCopilotWorkspace />
    </Suspense>
  );
}
