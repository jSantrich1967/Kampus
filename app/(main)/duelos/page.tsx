"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { DuelHub } from "@/components/duels/duel-hub";

function DuelosPageContent() {
  const router = useRouter();
  const { profile, hydrated, authReady } = useKampus();

  useEffect(() => {
    if (!hydrated || !authReady) return;
    if (!profile.onboardingFinished) {
      router.replace("/onboarding");
      return;
    }
    if (profile.role !== "student" && profile.role !== "learner") router.replace("/today");
  }, [hydrated, authReady, profile.onboardingFinished, profile.role, router]);

  if (!hydrated || !authReady || (profile.role !== "student" && profile.role !== "learner") || !profile.onboardingFinished) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  return <DuelHub />;
}

export default function DuelosPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <DuelosPageContent />
    </Suspense>
  );
}
