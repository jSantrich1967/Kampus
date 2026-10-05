"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { DuelArena } from "@/components/duels/duel-arena";

function DuelPracticePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, hydrated } = useKampus();
  const autostart = searchParams.get("autostart") === "1";

  useEffect(() => {
    if (!hydrated) return;
    if (!profile.onboardingFinished) {
      router.replace("/onboarding");
      return;
    }
    if (profile.role !== "student" && profile.role !== "learner") router.replace("/today");
  }, [hydrated, profile.onboardingFinished, profile.role, router]);

  if (!hydrated || (profile.role !== "student" && profile.role !== "learner") || !profile.onboardingFinished) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  return <DuelArena code="PRACTICA" demo autostart={autostart} />;
}

export default function DuelPracticePage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <DuelPracticePageContent />
    </Suspense>
  );
}
