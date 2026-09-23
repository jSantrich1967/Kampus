"use client";

import Link from "next/link";
import { Suspense, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { SectionProntoBanner } from "@/components/layout/section-pronto-banner";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PresentationPlanner } from "@/components/collaborate/presentation-planner";

export function ExposicionesEntry() {
  const { profile, hydrated } = useKampus();
  const [showPlanner, setShowPlanner] = useState(false);

  if (!hydrated) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  if (profile.role !== "teacher") {
    return <PresentationPlanner />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Colaborar"
        title="Exposiciones de tus alumnos"
        description="Revisa, comenta y califica las exposiciones asignadas. También puedes crear la plantilla que usarán tus estudiantes."
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link href="/teaching">
              <Button className="w-full sm:w-auto">Abrir Copiloto docente</Button>
            </Link>
            <Link href="/collaborate/aula-virtual">
              <Button variant="secondary" className="w-full sm:w-auto">
                Ir al aula virtual
              </Button>
            </Link>
          </div>
        }
      />

      <SectionProntoBanner kind="teacher" />

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calificar con rúbrica</CardTitle>
            <CardDescription>
              Genera rúbricas, sugiere feedback y exporta calificaciones desde el Copiloto docente.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Link href="/teaching">
              <Button variant="secondary">Abrir Copiloto docente</Button>
            </Link>
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revisar en el aula virtual</CardTitle>
            <CardDescription>
              Acompaña las exposiciones en vivo y deja observaciones por estudiante.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Link href="/collaborate/aula-virtual">
              <Button variant="secondary">Ir al aula virtual</Button>
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plantilla de exposición</CardTitle>
          <CardDescription>
            Crea la estructura (tema, criterios y fecha) que tus alumnos usarán al planificar su exposición.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <Button variant="secondary" onClick={() => setShowPlanner((v) => !v)}>
            {showPlanner ? "Ocultar planificador" : "Crear plantilla"}
          </Button>
        </div>
        {showPlanner ? (
          <div className="border-t border-white/10 px-6 py-6">
            <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
              <PresentationPlanner />
            </Suspense>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
