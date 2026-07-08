"use client";

import { useKampus } from "@/components/kampus/kampus-provider";
import { ExamsHub } from "@/components/exams/exams-hub";
import { StudentExamsList } from "@/components/exams/student-exams-list";

/** Students see their inbox at /exams; teachers keep the dual hub. No redirect. */
export function ExamsEntry() {
  const { profile, hydrated } = useKampus();

  if (!hydrated) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  if (profile.role === "student" || profile.role === "learner") {
    return <StudentExamsList />;
  }

  return <ExamsHub />;
}
