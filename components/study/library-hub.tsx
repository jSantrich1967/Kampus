"use client";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { NotebookLibraryPanel } from "@/components/study/notebook-library-panel";
import { navCopy } from "@/lib/i18n/nav";

export function LibraryHub() {
  const { profile, authUserId } = useKampus();
  const focus = profile.subjects[0] ?? "General";
  const t = navCopy.es;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t.groups.learn}
        title={t.items.library}
        description="Cuadernos por materia: subida con calendario aquí; índice, etiquetas y subida rápida en el lector."
        actions={
          authUserId ? (
            <ShareLinkButton
              pathname="/study/library"
              campaign="ai_library"
              extra={{ focus }}
              refHandle={profile.university || "kampus"}
              label="Compartir cuadernos"
              copiedLabel="Copiado"
            />
          ) : null
        }
      />

      <NotebookLibraryPanel />
    </div>
  );
}
