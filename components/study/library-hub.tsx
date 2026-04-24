"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NotebookLibraryPanel } from "@/components/study/notebook-library-panel";
import { navCopy } from "@/lib/i18n/nav";

export function LibraryHub() {
  const { profile } = useKampus();
  const focus = profile.subjects[0] ?? "General";
  const t = navCopy.es;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t.groups.learn}
        title="Mis cuadernos"
        description="Cuadernos por materia: sube material, ábrelo clase a clase, genera kits de estudio y recupera clases perdidas — el rescate vive aquí, como parte del mismo flujo."
        actions={
          <ShareLinkButton
            pathname="/study/library"
            campaign="ai_library"
            extra={{ focus }}
            refHandle={profile.university || "kampus"}
            label="Compartir enlace de mis cuadernos"
            copiedLabel="Copiado"
          />
        }
      />

      <Card className="border-indigo-400/25 bg-gradient-to-br from-indigo-500/15 to-slate-950/80 ring-1 ring-indigo-400/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-indigo-100">
            <Sparkles className="h-5 w-5 text-indigo-300" />
            {t.items.rescue}
          </CardTitle>
          <CardDescription>
            Genera el kit a partir de tus archivos, apuntes o todo un cuaderno; usa las mismas etiquetas (materia, tema,
            punto…) y guarda el resultado como una hoja más en tu cuaderno.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2 px-6 pb-6">
          <Link href="/study/library/rescue">
            <Button size="sm" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Abrir rescate de clase
            </Button>
          </Link>
        </div>
      </Card>

      <NotebookLibraryPanel />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            t: "Ruta express",
            d: "15–25 min · alta utilidad examen",
            tone: "text-emerald-200",
          },
          {
            t: "Comprensión profunda",
            d: "45–90 min · para huecos grandes",
            tone: "text-indigo-200",
          },
          {
            t: "Simulacro",
            d: "20–40 min · presión real",
            tone: "text-amber-200",
          },
        ].map((row) => (
          <Card key={row.t}>
            <CardHeader>
              <CardTitle className={row.tone}>{row.t}</CardTitle>
              <CardDescription>{row.d}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ruta recomendada (demo)</CardTitle>
          <CardDescription>
            Con material en tus cuadernos, enlaza con radar y rescate para preparar la semana.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          <Link href="/risk">
            <Button size="sm" variant="secondary">
              Ver radar
            </Button>
          </Link>
          <Link href="/study/library/rescue">
            <Button size="sm" variant="ghost">
              Abrir rescate
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
