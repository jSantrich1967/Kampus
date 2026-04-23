import type { Metadata } from "next";
import { Suspense } from "react";

import { StudentExamsList } from "@/components/exams/student-exams-list";

export const metadata: Metadata = { title: "Exámenes (estudiante)" };

export default function StudentExamsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <StudentExamsList />
    </Suspense>
  );
}

