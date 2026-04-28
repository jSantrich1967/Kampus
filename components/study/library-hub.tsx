"use client";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
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
        description="Crea tus cuadernos por materia, organiza tus clases/sesiones y genera kits de estudio cuando se acerque una evaluación."
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
    </div>
  );
}
