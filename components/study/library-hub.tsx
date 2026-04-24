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
        eyebrow="Recursos"
        title="Biblioteca IA"
        description="Dificultad, tiempo de consumo y utilidad para examen — rutas recomendadas por riesgo."
        actions={
          <ShareLinkButton
            pathname="/study/library"
            campaign="ai_library"
            extra={{ focus }}
            refHandle={profile.university || "kampus"}
            label="Compartir biblioteca"
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
            Conecta con radar y rescate cuando exista contenido indexado.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          <Link href="/risk">
            <Button size="sm" variant="secondary">
              Ver radar
            </Button>
          </Link>
          <Link href="/rescue">
            <Button size="sm" variant="ghost">
              Abrir rescate
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
