import type { Metadata } from "next";
import { Suspense } from "react";

import { ClassRescueWorkspace } from "@/components/rescue/class-rescue-workspace";

export const metadata: Metadata = {
  title: "Rescate de clase",
};

export default function RescuePage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <ClassRescueWorkspace />
    </Suspense>
  );
}
