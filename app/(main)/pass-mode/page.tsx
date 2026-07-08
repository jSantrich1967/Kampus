"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PassModePanel } from "@/components/pass-mode/pass-mode-panel";

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

  return <PassModePanel />;
}

export default function PassModePage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando Modo aprobar…</div>}>
      <PassModePageContent />
    </Suspense>
  );
}
