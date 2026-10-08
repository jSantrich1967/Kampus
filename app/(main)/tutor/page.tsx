"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { SocraticTutorPanel } from "@/components/tutor/socratic-tutor-panel";
import { ProRequiredCard } from "@/components/billing/pro-required-card";
import { isDemoBrowser } from "@/lib/demo/demo-session";

function TutorPageContent() {
  const router = useRouter();
  const { profile, hydrated, authUserId } = useKampus();
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    setDemo(isDemoBrowser());
  }, []);

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

  // El Tutor IA es del plan Pro. En vez de rebotar en silencio a Hoy, lo
  // decimos aquí mismo y ofrecemos activarlo. La demo pública sí puede
  // probarlo (la API aplica su cupo corto por IP).
  if (profile.plan !== "premium" && !(demo && !authUserId)) {
    return (
      <ProRequiredCard
        eyebrow="Tutor IA"
        feature="El Tutor IA"
        description="Tu plan Estudiante no incluye el Tutor IA. Con Pro lo tienes junto al Modo examen y el Modo aprobar."
      />
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
