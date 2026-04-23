import type { Metadata } from "next";
import { Suspense } from "react";

import { StudentExamDetail } from "@/components/exams/student-exam-detail";

export const metadata: Metadata = { title: "Detalle de examen" };

export default function StudentExamDetailPage({ params }: { params: { examId: string } }) {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <StudentExamDetail examId={params.examId} />
    </Suspense>
  );
}

