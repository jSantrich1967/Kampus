"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { ReviewSession } from "@/components/reviews/review-session";

export function ReviewSessionPage() {
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

  if (
    !hydrated ||
    !authReady ||
    (profile.role !== "student" && profile.role !== "learner") ||
    !profile.onboardingFinished
  ) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Repasos"
        title="Repetición espaciada"
        description="Tus tarjetas vuelven justo antes de que las olvides. Califica con honestidad y Kampus decide cuándo repasar cada una."
      />
      <ReviewSession />
    </div>
  );
}
