"use client";

import { Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { buildPassModeSubjectHref } from "@/lib/today/block-action-href";
import { ShareLinkButton } from "@/components/growth/share-link-button";
import { useKampus } from "@/components/kampus/kampus-provider";
import { RescuePackDisplay } from "@/components/rescue/rescue-pack-display";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { RescuePack } from "@/lib/class-rescue";
import { combineNotebookExtractedTextForPack } from "@/lib/notebooks/document-tags";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import { postRescuePack } from "@/lib/rescue/post-rescue-pack";

type Scope = "page" | "notebook";

function mimeToSourceKind(mime: string): "pdf" | "audio" | "image" | "slides" | "link" | "notes" {
  const m = mime.toLowerCase();
  if (m.includes("pdf")) return "pdf";
  if (m.startsWith("image/")) return "image";
  return "notes";
}

type Props = {
  pages: NotebookDocumentRow[];
  currentPage: NotebookDocumentRow;
  subjectLabel: string;
  subjectSlug: string;
  /** Desde quiz de presión: genera kit de esta hoja y hace scroll al panel. */
  autoGenerateKit?: boolean;
};

export function NotebookStudyKitPanel({
  pages,
  currentPage,
  subjectLabel,
  subjectSlug,
  autoGenerateKit = false,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const autoKitRanForPage = useRef<string | null>(null);
  const { profile } = useKampus();
  const premium = profile.plan === "premium";
  const [scope, setScope] = useState<Scope>("page");
  const [pack, setPack] = useState<RescuePack | null>(null);
  const [packBusy, setPackBusy] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);

  const kitDocs = useMemo(() => {
    if (scope === "page") {
      return [currentPage];
    }
    return pages;
  }, [scope, pages, currentPage]);

  const total = pages.length;

  useEffect(() => {
    if (scope !== "page") return;
    setPack(null);
    setPackError(null);
  }, [currentPage.id, scope]);

  const { extractedFileText, sourceLabel, uploadedFileCount, sourceKind, fallbackSeed } = useMemo(() => {
    if (kitDocs.length === 0) {
      return {
        extractedFileText: "",
        sourceLabel: "Sin coincidencias",
        uploadedFileCount: 0,
        sourceKind: "notes" as const,
        fallbackSeed: "",
      };
    }
    if (scope === "page") {
      const d = kitDocs[0]!;
      const combined = combineNotebookExtractedTextForPack(kitDocs);
      return {
        extractedFileText: combined,
        sourceLabel: d.filename,
        uploadedFileCount: 1,
        sourceKind: mimeToSourceKind(d.mime_type ?? ""),
        fallbackSeed: combined,
      };
    }
    const combined = combineNotebookExtractedTextForPack(kitDocs);
    return {
      extractedFileText: combined,
      sourceLabel: `Cuaderno (${kitDocs.length} archivos)`,
      uploadedFileCount: kitDocs.length,
      sourceKind: "notes" as const,
      fallbackSeed: combined,
    };
  }, [scope, kitDocs]);

  const generateKit = useCallback(
    async (docOverride?: NotebookDocumentRow[]) => {
      const docs = docOverride ?? kitDocs;
      if (docs.length === 0) return;

      const combined = combineNotebookExtractedTextForPack(docs);
      const label =
        docs.length === 1
          ? docs[0]!.filename
          : `Cuaderno (${docs.length} archivos)`;
      const kind =
        docs.length === 1 ? mimeToSourceKind(docs[0]!.mime_type ?? "") : ("notes" as const);

      setPackBusy(true);
      setPackError(null);
      const subjectHint = subjectLabel.trim() || "Cuaderno";
      const body = {
        subjectHint,
        sourceLabel: label,
        sourceKind: kind,
        extractedFileText: combined,
        notes: "",
        link: "",
        uploadedFileCount: docs.length,
        seedText: "",
        packMode: premium ? ("full" as const) : ("lite" as const),
      };
      const { pack: next, packError: err } = await postRescuePack(body, {
        seedText: combined,
        subjectHint,
        sourceLabel: label,
        sourceKind: kind,
      });
      setPack(next);
      setPackError(err);
      setPackBusy(false);
    },
    [kitDocs, premium, subjectLabel],
  );

  useEffect(() => {
    if (!autoGenerateKit) return;
    if (autoKitRanForPage.current === currentPage.id) return;

    autoKitRanForPage.current = currentPage.id;
    setScope("page");
    void generateKit([currentPage]).then(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [autoGenerateKit, currentPage, generateKit]);

  const noMatches = kitDocs.length === 0;

  return (
    <div ref={panelRef} id="notebook-study-kit" className="mx-auto mt-10 max-w-5xl space-y-4 scroll-mt-24">
      <Card
        className={cn(
          "border-indigo-400/20 bg-indigo-500/[0.06]",
          autoGenerateKit && "ring-2 ring-indigo-400/40",
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-indigo-100">
            <Sparkles className="h-5 w-5 text-indigo-300" />
            Kit de estudio
          </CardTitle>
          <CardDescription>
            {autoGenerateKit
              ? "Generando kit desde el apunte que repasas (viene del quiz de presión)…"
              : "Genera un kit rápido desde esta hoja o desde todo el cuaderno. Para filtros avanzados por Tema / Punto / Ejercicios, usa «más opciones»."}
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

          <p className="text-xs text-slate-500">
            Se usarán <strong className="text-slate-300">{kitDocs.length}</strong> archivo{kitDocs.length === 1 ? "" : "s"} en este kit.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" className="gap-2" onClick={() => void generateKit()} disabled={packBusy || noMatches}>
              <Wand2 className="h-4 w-4" />
              {packBusy ? "Generando…" : "Generar kit de estudio"}
            </Button>
            <Link
              href={`/study/library/rescue?subject=${encodeURIComponent(subjectLabel)}&notebook=${encodeURIComponent(subjectSlug)}`}
              className="text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
            >
              Abrir kit de estudios del cuaderno (más opciones)
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
              <Link href={buildPassModeSubjectHref(subjectLabel.trim() || "General", "kit")}>
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
