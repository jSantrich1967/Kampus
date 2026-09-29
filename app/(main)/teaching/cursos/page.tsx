import type { Metadata } from "next";
import { Suspense } from "react";

import { CourseList } from "@/components/teaching/course-list";

export const metadata: Metadata = { title: "Cursos" };

export default function CoursesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <CourseList />
    </Suspense>
  );
}
