import type { Metadata } from "next";
import { Suspense } from "react";

import { StudentExamDetail } from "@/components/exams/student-exam-detail";

export const metadata: Metadata = { title: "Detalle de examen" };

/** Next.js 15+: dynamic route `params` is a Promise and must be awaited. */
export default async function StudentExamDetailPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <StudentExamDetail examId={examId} />
    </Suspense>
  );
}

