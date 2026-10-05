"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { DuelArena } from "@/components/duels/duel-arena";

function DuelCodePageContent() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
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

  return <DuelArena code={String(params.code ?? "")} />;
}

export default function DuelCodePage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <DuelCodePageContent />
    </Suspense>
  );
}
