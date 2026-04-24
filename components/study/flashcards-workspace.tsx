"use client";

import Link from "next/link";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function FlashcardsWorkspace() {
  const { profile, locale } = useKampus();
  const es = locale === "es";
  const focus = profile.weakTopics[0] ?? profile.subjects[0] ?? (es ? "General" : "General");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={es ? "Estudiar" : "Study"}
        title={es ? "Tarjetas adaptativas" : "Adaptive flashcards"}
        description={
          es
            ? "Sesiones cortas conectadas a tus temas débiles y a Modo aprobar (MVP)."
            : "Short sessions tied to weak topics and Pass Mode (MVP)."
        }
        actions={
          <ShareLinkButton
            pathname="/study/flashcards"
            campaign="quiz_deck"
            extra={{ focus }}
            refHandle={profile.university || "kampus"}
            label={es ? "Compartir mazo" : "Share deck"}
            copiedLabel={es ? "Copiado" : "Copied"}
          />
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{es ? "Repaso solo conceptos flojos" : "Review only weak concepts"}</CardTitle>
          <CardDescription>
            {es ? "Prioridad actual:" : "Current priority:"}{" "}
            <span className="text-indigo-200">{focus}</span>
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          <Link href="/pass-mode">
            <Button size="sm" variant="secondary">
              {es ? "Alinear con Modo aprobar" : "Align with Pass Mode"}
            </Button>
          </Link>
          <Link href="/study/rescue">
            <Button size="sm" variant="ghost">
              {es ? "Generar tarjetas desde rescate" : "Generate from rescue"}
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
