"use client";

import { useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { CramMode } from "@/components/cram/cram-mode";
import { ProRequiredCard } from "@/components/billing/pro-required-card";
import { isDemoBrowser } from "@/lib/demo/demo-session";

/**
 * Modo examen es del plan Pro: el usuario del plan Estudiante ve la
 * explicación y la activación aquí mismo, sin rebotes silenciosos.
 * La demo pública puede probarlo (la API aplica su cupo por IP).
 */
export function CramModeGate() {
  const { profile, hydrated } = useKampus();
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    setDemo(isDemoBrowser());
  }, []);

  if (!hydrated) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  if (profile.plan !== "premium" && !demo) {
    return (
      <ProRequiredCard
        eyebrow="Modo examen"
        feature="El Modo examen"
        description="Tu plan Estudiante no incluye el Modo examen. Con Pro lo tienes junto al Tutor IA y el Modo aprobar."
      />
    );
  }

  return <CramMode />;
}
