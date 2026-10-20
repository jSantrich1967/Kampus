"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { SoftSkillsPanel } from "@/components/soft-skills/soft-skills-panel";

function HabilidadesPageContent() {
  const router = useRouter();
  const { profile, hydrated, authReady } = useKampus();

  useEffect(() => {
    // Mismo guard que el Tutor: esperar a authReady para no redirigir con un
    // perfil local de otra sesión.
    if (!hydrated || !authReady) return;
    if (!profile.onboardingFinished) {
      router.replace("/onboarding");
      return;
    }
    if (profile.role !== "student" && profile.role !== "learner") router.replace("/today");
  }, [hydrated, authReady, profile.onboardingFinished, profile.role, router]);

  if (!hydrated || !authReady || (profile.role !== "student" && profile.role !== "learner") || !profile.onboardingFinished) {
    return (
      <div className="text-sm text-slate-400">
        {!hydrated || !authReady ? "Cargando…" : "Redirigiendo…"}
      </div>
    );
  }

  return <SoftSkillsPanel />;
}

export default function HabilidadesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <HabilidadesPageContent />
    </Suspense>
  );
}
