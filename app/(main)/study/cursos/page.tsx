import type { Metadata } from "next";
import { Suspense } from "react";

import { JoinCourse } from "@/components/study/join-course";

export const metadata: Metadata = { title: "Mis cursos" };

export default function MyCoursesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <JoinCourse />
    </Suspense>
  );
}
