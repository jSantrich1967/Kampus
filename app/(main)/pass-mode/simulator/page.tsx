"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { ProfessorSimulatorPanel } from "@/components/pass-mode/professor-simulator-panel";

function PassModeSimulatorPageContent() {
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

  return <ProfessorSimulatorPanel />;
}

export default function PassModeSimulatorPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando simulador…</div>}>
      <PassModeSimulatorPageContent />
    </Suspense>
  );
}
