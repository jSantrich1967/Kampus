"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Bot } from "lucide-react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { SocraticTutorPanel } from "@/components/tutor/socratic-tutor-panel";
import { PageHeader } from "@/components/layout/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isDemoBrowser } from "@/lib/demo/demo-session";

function TutorPageContent() {
  const router = useRouter();
  const { profile, hydrated } = useKampus();
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
  if (profile.plan !== "premium" && !demo) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Tutor IA"
          title="El Tutor IA es del plan Pro"
          description="Tu plan Estudiante no incluye el Tutor IA. Con Pro lo tienes con cuota amplia, junto al Modo examen y el Modo aprobar."
        />
        <Card className="border-purple-400/25 bg-purple-500/[0.06]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4" aria-hidden />
              Activa Pro por $10,30 al mes
            </CardTitle>
            <CardDescription>
              Pagas por Pago Móvil o Zelle, reportas tu pago y te activamos el mismo día. Sin
              renovación automática.
            </CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-2 px-6 pb-6">
            <Link href="/pro" className={buttonClasses({ size: "sm" })}>
              Pasarme a Pro
            </Link>
            <Link href="/today" className={buttonClasses({ size: "sm", variant: "secondary" })}>
              Volver a Hoy
            </Link>
          </div>
        </Card>
      </div>
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
