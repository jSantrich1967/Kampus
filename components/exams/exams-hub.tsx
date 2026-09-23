"use client";

import Link from "next/link";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilePlus2, Sparkles } from "lucide-react";

export function ExamsHub() {
  const { profile } = useKampus();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Evaluación"
        title="Evaluaciones"
        description="Crea, corrige y publica exámenes — un solo lugar para todo el flujo."
        actions={
          <ShareLinkButton
            pathname="/exams"
            campaign="exam_workflow"
            refHandle={profile.university || "kampus"}
            label="Compartir"
            copiedLabel="Copiado"
          />
        }
      />

      <Card className="border-purple-400/20 bg-purple-500/[0.06]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-100">
            <FilePlus2 className="h-4 w-4" />
            Crear un examen
          </CardTitle>
          <CardDescription>
            El generador arma el examen por ti: eliges materia, tema y dificultad, y lo tienes
            listo para publicar en minutos.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2 px-6 pb-6">
          <Link href="/teaching/examenes" className={buttonClasses({ size: "sm", className: "gap-2" })}>
            <FilePlus2 className="h-4 w-4" />
            Crear examen
          </Link>
        </div>
      </Card>

      <Card className="border-indigo-400/20 bg-indigo-500/[0.06]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-100">
            <Sparkles className="h-4 w-4" />
            Corregir exámenes con IA
          </CardTitle>
          <CardDescription>
            Pega tu clave de respuestas y las respuestas del alumno (texto o foto del examen). La IA corrige
            pregunta por pregunta y te da la nota con retroalimentación.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2 px-6 pb-6">
          <Link href="/exams/corrector" className={buttonClasses({ size: "sm", className: "gap-2" })}>
            <Sparkles className="h-4 w-4" />
            Corregir un examen
          </Link>
        </div>
      </Card>

      <Card className="border-indigo-400/20 bg-indigo-500/[0.06]">
        <CardHeader>
          <CardTitle className="text-indigo-100">Mi calendario académico</CardTitle>
          <CardDescription>
            Exámenes con fecha, exposición (si pones fecha en el planificador) y trabajos o investigaciones que registres —
            todo en una sola vista mensual.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2 px-6 pb-6">
          <Link href="/exams/calendar" className={buttonClasses({ size: "sm", className: "gap-2" })}>
            Abrir calendario
          </Link>
          <Link
            href="/collaborate/exposiciones"
            className={buttonClasses({ size: "sm", variant: "secondary", className: "gap-2" })}
          >
            Crear exposición
          </Link>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lado estudiante</CardTitle>
            <CardDescription>Ver exámenes, enviar intentos y recibir feedback.</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Link href="/exams/student" className={buttonClasses({ size: "sm", variant: "secondary" })}>
              Ver como estudiante
            </Link>
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Copiloto docente</CardTitle>
            <CardDescription>Rúbricas, feedback y publicación de notas.</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Link href="/teaching" className={buttonClasses({ size: "sm", variant: "secondary" })}>
              Abrir copiloto
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
