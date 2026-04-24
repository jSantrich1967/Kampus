"use client";

import { Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { useKampus } from "@/components/kampus/kampus-provider";
import { RescuePackDisplay } from "@/components/rescue/rescue-pack-display";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { RescuePack } from "@/lib/class-rescue";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import { postRescuePack } from "@/lib/rescue/post-rescue-pack";

type Scope = "page" | "notebook";

function mimeToSourceKind(mime: string): "pdf" | "audio" | "image" | "slides" | "link" | "notes" {
  const m = mime.toLowerCase();
  if (m.includes("pdf")) return "pdf";
  if (m.startsWith("image/")) return "image";
  return "notes";
}

function combineNotebookExtractedText(docs: NotebookDocumentRow[]): string {
  return docs
    .map(
      (d) =>
        `# ${d.filename}\n${d.extracted_text?.trim() ? d.extracted_text.trim() : "(sin texto extraído aún — puedes re-subir el archivo en Mis cuadernos)"}`,
    )
    .join("\n\n");
}

type Props = {
  pages: NotebookDocumentRow[];
  currentPage: NotebookDocumentRow;
  subjectLabel: string;
  subjectSlug: string;
};

export function NotebookStudyKitPanel({ pages, currentPage, subjectLabel, subjectSlug }: Props) {
  const { profile } = useKampus();
  const premium = profile.plan === "premium";
  const [scope, setScope] = useState<Scope>("page");
  const [pack, setPack] = useState<RescuePack | null>(null);
  const [packBusy, setPackBusy] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);

  const total = pages.length;

  useEffect(() => {
    if (scope !== "page") return;
    setPack(null);
    setPackError(null);
  }, [currentPage.id, scope]);

  const { extractedFileText, sourceLabel, uploadedFileCount, sourceKind, fallbackSeed } = useMemo(() => {
    if (scope === "page") {
      const text = currentPage.extracted_text?.trim() ?? "";
      return {
        extractedFileText: text,
        sourceLabel: currentPage.filename,
        uploadedFileCount: 1,
        sourceKind: mimeToSourceKind(currentPage.mime_type ?? ""),
        fallbackSeed: text,
      };
    }
    const combined = combineNotebookExtractedText(pages);
    return {
      extractedFileText: combined,
      sourceLabel: `Cuaderno (${pages.length} archivos)`,
      uploadedFileCount: pages.length,
      sourceKind: "notes" as const,
      fallbackSeed: combined,
    };
  }, [scope, pages, currentPage]);

  async function generateKit() {
    setPackBusy(true);
    setPackError(null);
    const subjectHint = subjectLabel.trim() || "Cuaderno";
    const body = {
      subjectHint,
      sourceLabel,
      sourceKind,
      extractedFileText,
      notes: "",
      link: "",
      uploadedFileCount,
      seedText: "",
    };
    const { pack: next, packError: err } = await postRescuePack(body, {
      seedText: fallbackSeed,
      subjectHint,
      sourceLabel,
      sourceKind,
    });
    setPack(next);
    setPackError(err);
    setPackBusy(false);
  }

  return (
    <div className="mx-auto mt-10 max-w-5xl space-y-4">
      <Card className="border-indigo-400/20 bg-indigo-500/[0.06]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-indigo-100">
            <Sparkles className="h-5 w-5 text-indigo-300" />
            Kit de estudio
          </CardTitle>
          <CardDescription>
            Mismo motor que en Rescate de clase: resumen, ideas clave, quiz y checklist, anclado al texto extraído de
            tus archivos.
          </CardDescription>
        </CardHeader>
        <div className="space-y-4 px-6 pb-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setScope("page");
                setPack(null);
                setPackError(null);
              }}
              className={cn(
                "rounded-full px-3 py-1 text-xs ring-1 transition",
                scope === "page" ? "bg-indigo-500/25 text-white ring-indigo-400/50" : "bg-white/5 text-slate-300 ring-white/10 hover:bg-white/10",
              )}
            >
              Solo esta hoja
            </button>
            <button
              type="button"
              onClick={() => {
                setScope("notebook");
                setPack(null);
                setPackError(null);
              }}
              className={cn(
                "rounded-full px-3 py-1 text-xs ring-1 transition",
                scope === "notebook" ? "bg-indigo-500/25 text-white ring-indigo-400/50" : "bg-white/5 text-slate-300 ring-white/10 hover:bg-white/10",
              )}
            >
              Todo el cuaderno ({total} archivos)
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" className="gap-2" onClick={() => void generateKit()} disabled={packBusy}>
              <Wand2 className="h-4 w-4" />
              {packBusy ? "Generando…" : "Generar kit de estudio"}
            </Button>
            <Link
              href={`/rescue?subject=${encodeURIComponent(subjectLabel)}&notebook=${encodeURIComponent(subjectSlug)}`}
              className="text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
            >
              Abrir en Rescate de clase (más opciones)
            </Link>
          </div>

          {packError ? (
            <p className="text-xs text-amber-200">Usamos un kit básico porque falló la IA: {packError}</p>
          ) : null}
        </div>
      </Card>

      {pack ? (
        <RescuePackDisplay
          pack={pack}
          premium={premium}
          headerActions={
            <>
              <ShareLinkButton
                pathname={`/study/notebook/${subjectSlug}`}
                campaign="rescue_pack"
                extra={{ subject: subjectLabel.trim() || undefined, kit: pack.subjectLine.slice(0, 40) }}
                refHandle={profile.university || "kampus"}
                label="Compartir kit"
                copiedLabel="Copiado"
              />
              <Link href="/pass-mode">
                <Button variant="secondary" size="sm">
                  Llevar esto a Modo aprobar
                </Button>
              </Link>
            </>
          }
        />
      ) : null}
    </div>
  );
}
