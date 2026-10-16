"use client";

import { useKampus } from "@/components/kampus/kampus-provider";
import { ExamsHub } from "@/components/exams/exams-hub";
import { StudentExamsList } from "@/components/exams/student-exams-list";
import { CardSkeleton } from "@/components/ui/skeleton";

/** Students see their inbox at /exams; teachers keep the dual hub. No redirect. */
export function ExamsEntry() {
  const { profile, hydrated } = useKampus();

  if (!hydrated) {
    return (
      <div className="space-y-4" aria-label="Cargando exámenes">
        <CardSkeleton lines={2} />
        <CardSkeleton lines={3} />
      </div>
    );
  }

  if (profile.role === "student" || profile.role === "learner") {
    return <StudentExamsList />;
  }

  return <ExamsHub />;
}
