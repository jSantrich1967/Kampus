import type { Metadata } from "next";
import { Suspense } from "react";

import { TeacherNotices } from "@/components/teaching/teacher-notices";

export const metadata: Metadata = { title: "Avisos a estudiantes" };

export default function TeacherNoticesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <TeacherNotices />
    </Suspense>
  );
}
