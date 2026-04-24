"use client";

import Link from "next/link";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NotebookLibraryPanel } from "@/components/study/notebook-library-panel";

export function LibraryHub() {
  const { profile } = useKampus();
  const focus = profile.subjects[0] ?? "General";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Estudiar"
        title="Mis cuadernos"
        description="Aquí viven tus cuadernos por materia. Sube material, ábrelo clase a clase y desde cada cuaderno salta a rescate, radar o práctica cuando lo necesites."
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
          <Link href="/study/rescue">
            <Button size="sm" variant="ghost">
              Abrir rescate
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
