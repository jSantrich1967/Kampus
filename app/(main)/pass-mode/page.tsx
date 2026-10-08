"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PassModePanel } from "@/components/pass-mode/pass-mode-panel";
import { ProRequiredCard } from "@/components/billing/pro-required-card";
import { isDemoBrowser } from "@/lib/demo/demo-session";
import { useState } from "react";

function PassModePageContent() {
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

  const [demo, setDemo] = useState(false);
  useEffect(() => {
    setDemo(isDemoBrowser());
  }, []);

  if (!hydrated || profile.role !== "student" || !profile.onboardingFinished) {
    return (
      <div className="text-sm text-slate-400">
        {!hydrated
          ? "Cargando…"
          : !profile.onboardingFinished
            ? "Redirigiendo…"
            : profile.role !== "student"
              ? "Redirigiendo…"
              : "Cargando…"}
      </div>
    );
  }

  // Modo aprobar es del plan Pro: explicación y activación, sin rebote.
  if (profile.plan !== "premium" && !demo) {
    return (
      <ProRequiredCard
        eyebrow="Modo aprobar"
        feature="El Modo aprobar"
        description="Tu plan Estudiante no incluye el Modo aprobar. Con Pro lo tienes junto al Tutor IA y el Modo examen."
      />
    );
  }

  return <PassModePanel />;
}

export default function PassModePage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando Modo aprobar…</div>}>
      <PassModePageContent />
    </Suspense>
  );
}
