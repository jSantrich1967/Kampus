"use client";

import Link from "next/link";
import { useMemo } from "react";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buildSubjectRisks } from "@/lib/pass-mode";

function tone(risk: "low" | "medium" | "high") {
  if (risk === "high") return "danger" as const;
  if (risk === "medium") return "warning" as const;
  return "success" as const;
}

export function AcademicRiskRadar() {
  const { profile } = useKampus();
  const risks = useMemo(() => buildSubjectRisks(profile), [profile]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Radar académico"
        title="Dónde duele, y qué hacer hoy."
        description="Señal heurística a partir de fechas, temas débiles y carga. Conecta con Modo aprobar y Rescate."
        actions={
          <ShareLinkButton
            pathname="/risk"
            campaign="academic_radar"
            refHandle={profile.university || "kampus"}
            label="Compartir radar"
            copiedLabel="Copiado"
          />
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {risks.map((r) => (
          <Card key={r.subject}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{r.subject}</CardTitle>
                <Badge tone={tone(r.risk)}>{r.risk}</Badge>
              </div>
              <CardDescription>{r.nextAction}</CardDescription>
            </CardHeader>
            <div className="space-y-2">
              <Progress value={r.score} />
              <ul className="space-y-2 text-sm text-slate-300">
                {r.reasons.map((reason) => (
                  <li key={reason} className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">
                    {reason}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 pt-2">
                {profile.role === "student" ? (
                  <Link href="/pass-mode">
                    <Button size="sm" variant="secondary">
                      Modo aprobar
                    </Button>
                  </Link>
                ) : null}
                {profile.role === "student" || profile.role === "teacher" ? (
                  <Link href="/study/library/rescue">
                    <Button size="sm" variant="ghost">
                      Rescate
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
