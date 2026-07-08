"use client";

import Link from "next/link";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ExamsHub() {
  const { profile } = useKampus();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Evaluación"
        title="Flujo de exámenes"
        description="Intentos, retroalimentación y publicación — un solo hilo para alumnos y docentes."
        actions={
          <ShareLinkButton
            pathname="/exams"
            campaign="exam_workflow"
            refHandle={profile.university || "kampus"}
            label="Compartir flujo"
            copiedLabel="Copiado"
          />
        }
      />

      <Card className="border-indigo-400/20 bg-indigo-500/[0.06]">
        <CardHeader>
          <CardTitle className="text-indigo-100">Mi calendario académico</CardTitle>
          <CardDescription>
            Exámenes con fecha, exposición (si pones fecha en el planificador) y trabajos o investigaciones que registres —
            todo en una sola vista mensual.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2 px-6 pb-6">
          <Link href="/exams/calendar">
            <Button size="sm" className="gap-2">
              Abrir calendario
            </Button>
          </Link>
          <Link href="/collaborate/exposiciones">
            <Button size="sm" variant="secondary" className="gap-2">
              Crear exposición
            </Button>
          </Link>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lado estudiante</CardTitle>
            <CardDescription>Ver exámenes, enviar intentos y recibir feedback.</CardDescription>
          </CardHeader>
          <Link href="/exams">
            <Button size="sm" variant="secondary">
              Abrir exámenes (estudiante)
            </Button>
          </Link>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lado docente</CardTitle>
            <CardDescription>Copiloto + publicación controlada.</CardDescription>
          </CardHeader>
          <Link href="/teaching">
            <Button size="sm" variant="secondary">
              Abrir copiloto
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
