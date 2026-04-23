"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buildPassModePlan } from "@/lib/pass-mode";

export function PassModePanel() {
  const router = useRouter();
  const { profile } = useKampus();
  const plan = useMemo(() => buildPassModePlan(profile), [profile]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Modo aprobar"
        title="Menos estrés, más señal."
        description="Secuencia de estudio para hoy basada en urgencia, temas débiles y tiempo disponible."
        actions={
          <ShareLinkButton
            pathname="/pass-mode"
            campaign="pass_mode"
            refHandle={profile.university || "kampus"}
            label="Compartir plan"
            copiedLabel="Copiado"
          />
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Secuencia recomendada</CardTitle>
            <CardDescription>
              Bloques cortos, prioridad clara, cierre con siguiente paso.
            </CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {plan.sequence.map((block, idx) => (
              <div key={block.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-white">
                    {idx + 1}. {block.title}
                  </div>
                  <Badge tone={block.priority === "P1" ? "accent" : block.priority === "P2" ? "warning" : "neutral"}>
                    {block.priority}
                  </Badge>
                </div>
                <div className="mt-2 text-sm text-slate-300">
                  {block.subject} · {block.minutes} min
                </div>
                <div className="mt-1 text-sm text-slate-200">Enfoque: {block.focus}</div>
                <p className="mt-2 text-xs text-slate-400">{block.rationale}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Presupuesto diario</CardTitle>
              <CardDescription>
                {plan.dailyBudgetMinutes} minutos
              </CardDescription>
            </CardHeader>
            <Progress value={plan.preparednessScore} />
            <div className="mt-3 text-sm text-slate-300">
              Preparación estimada:{" "}
              <span className="font-semibold text-white">{plan.preparednessScore}%</span>
            </div>
            {plan.overloadNote ? <p className="mt-3 text-xs text-amber-100/90">{plan.overloadNote}</p> : null}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Próximas mejores acciones</CardTitle>
              <CardDescription>
                Conecta estudio, rescate y comunidad.
              </CardDescription>
            </CardHeader>
            <ul className="space-y-2 text-sm text-slate-200">
              {plan.nextBestActions.map((a) => (
                <li key={a} className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">
                  {a}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-2">
              <Link href="/rescue">
                <Button variant="secondary" className="w-full">
                  Abrir rescate
                </Button>
              </Link>
              <Link href="/study/flashcards">
                <Button variant="ghost" className="w-full">
                  Práctica rápida
                </Button>
              </Link>
            </div>
          </Card>

          {profile.plan === "free" ? (
            <Card className="border-indigo-400/30 bg-gradient-to-br from-indigo-500/10 to-cyan-400/5">
              <CardHeader>
                <CardTitle>Desbloquea Premium</CardTitle>
                <CardDescription>
                  Recalibración diaria, simulador de profesor y rescates profundos sin límite.
                </CardDescription>
              </CardHeader>
              <Button type="button" className="w-full" onClick={() => router.push("/settings")}>
                Ver planes
              </Button>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
