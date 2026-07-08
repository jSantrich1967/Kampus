"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PressureControlQuiz } from "@/components/study/pressure-control-quiz";

function PressureQuizPageContent() {
  const router = useRouter();
  const { profile, hydrated } = useKampus();

  useEffect(() => {
    if (!hydrated) return;
    if (!profile.onboardingFinished) {
      router.replace("/onboarding");
      return;
    }
    if (profile.role !== "student") router.replace("/today");
  }, [hydrated, profile.onboardingFinished, profile.role, router]);

  if (!hydrated || profile.role !== "student" || !profile.onboardingFinished) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  return <PressureControlQuiz />;
}

export default function PressureQuizPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando quiz…</div>}>
      <PressureQuizPageContent />
    </Suspense>
  );
}
