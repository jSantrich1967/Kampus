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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lado estudiante</CardTitle>
            <CardDescription>Ver exámenes, enviar intentos y recibir feedback.</CardDescription>
          </CardHeader>
          <Link href="/exams/student">
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
