import type { Metadata } from "next";
import { Suspense } from "react";

import { StudentExamDetail } from "@/components/exams/student-exam-detail";
import { ExamDetailLoading } from "@/components/exams/exam-detail-loading";

export const metadata: Metadata = { title: "Detalle de examen" };

/** Next.js 15+: dynamic route `params` is a Promise and must be awaited. */
export default async function StudentExamDetailPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  return (
    <Suspense fallback={<ExamDetailLoading />}>
      <StudentExamDetail examId={examId} />
    </Suspense>
  );
}

