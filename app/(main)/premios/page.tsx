"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PremiosPanel } from "@/components/premios/premios-panel";

const ALLOWED_ROLES = ["student", "learner", "teacher"];

function PremiosPageContent() {
  const router = useRouter();
  const { profile, hydrated, authReady } = useKampus();

  useEffect(() => {
    // Mismo guard que el Tutor: esperar a authReady para no redirigir con un
    // perfil local de otra sesión. Premios también sirve al docente (crea
    // premios para sus cursos), por eso entra el rol teacher.
    if (!hydrated || !authReady) return;
    if (!profile.onboardingFinished) {
      router.replace("/onboarding");
      return;
    }
    if (!ALLOWED_ROLES.includes(profile.role)) router.replace("/today");
  }, [hydrated, authReady, profile.onboardingFinished, profile.role, router]);

  if (!hydrated || !authReady || !ALLOWED_ROLES.includes(profile.role) || !profile.onboardingFinished) {
    return (
      <div className="text-sm text-slate-400">
        {!hydrated || !authReady ? "Cargando…" : "Redirigiendo…"}
      </div>
    );
  }

  return <PremiosPanel />;
}

export default function PremiosPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <PremiosPageContent />
    </Suspense>
  );
}
