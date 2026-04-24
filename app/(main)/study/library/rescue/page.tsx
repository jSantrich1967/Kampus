import type { Metadata } from "next";
import { Suspense } from "react";

import { ClassRescueWorkspace } from "@/components/rescue/class-rescue-workspace";

export const metadata: Metadata = {
  title: "Kit de estudios del cuaderno",
};

export default function LibraryRescuePage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <ClassRescueWorkspace />
    </Suspense>
  );
}
