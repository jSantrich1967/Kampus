"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PlanFlashcardsSession } from "@/components/study/plan-flashcards-session";
import type { UserRole } from "@/lib/schemas/profile";

const FLASHCARD_ROLES: UserRole[] = ["student", "teacher", "learner", "institution"];

function canUseFlashcards(role: UserRole): boolean {
  return FLASHCARD_ROLES.includes(role);
}

function PassModeFlashcardsPageContent() {
  const router = useRouter();
  const { profile, hydrated } = useKampus();

  useEffect(() => {
    if (!hydrated) return;
    if (!profile.onboardingFinished) {
      router.replace("/onboarding");
      return;
    }
    if (!canUseFlashcards(profile.role)) router.replace("/today");
  }, [hydrated, profile.onboardingFinished, profile.role, router]);

  if (!hydrated || !canUseFlashcards(profile.role) || !profile.onboardingFinished) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  return <PlanFlashcardsSession />;
}

export default function PassModeFlashcardsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando tarjetas…</div>}>
      <PassModeFlashcardsPageContent />
    </Suspense>
  );
}
