"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { SocraticTutorPanel } from "@/components/tutor/socratic-tutor-panel";

function TutorPageContent() {
  const router = useRouter();
  const { profile, hydrated } = useKampus();

  useEffect(() => {
    if (!hydrated) return;
    if (!profile.onboardingFinished) {
      router.replace("/onboarding");
      return;
    }
    if (profile.role !== "student" && profile.role !== "learner") router.replace("/today");
  }, [hydrated, profile.onboardingFinished, profile.role, router]);

  if (!hydrated || (profile.role !== "student" && profile.role !== "learner") || !profile.onboardingFinished) {
    return (
      <div className="text-sm text-slate-400">
        {!hydrated ? "Cargando…" : "Redirigiendo…"}
      </div>
    );
  }

  return <SocraticTutorPanel />;
}

export default function TutorPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <TutorPageContent />
    </Suspense>
  );
}
