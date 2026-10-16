"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { SocraticTutorPanel } from "@/components/tutor/socratic-tutor-panel";

function TutorPageContent() {
  const router = useRouter();
  const { profile, hydrated, authReady } = useKampus();

  useEffect(() => {
    // Esperar a authReady: el perfil local inicial puede ser de otro rol
    // (demo/sesión anterior) y redirigiría a /today por error antes de que
    // cargue el perfil real del usuario.
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

  // El Tutor IA es del plan Pro, pero con cuenta Estudiante hay probada
  // gratis (3 preguntas al día): primero se siente el valor y la tarjeta
  // de Pro aparece al agotarla, dentro del propio tutor. La API aplica el
  // cupo en el servidor; aquí nadie queda bloqueado en seco.
  return <SocraticTutorPanel />;
}

export default function TutorPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <TutorPageContent />
    </Suspense>
  );
}
