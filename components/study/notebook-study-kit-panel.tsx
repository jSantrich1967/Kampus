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
import {
  combineNotebookExtractedTextForPack,
  documentMatchesTagFilters,
  filterDocumentsByTags,
  type NotebookTagFilters,
} from "@/lib/notebooks/document-tags";
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
};

export function NotebookStudyKitPanel({ pages, currentPage, subjectLabel, subjectSlug }: Props) {
  const { profile } = useKampus();
  const premium = profile.plan === "premium";
  const [scope, setScope] = useState<Scope>("page");
  const [pack, setPack] = useState<RescuePack | null>(null);
  const [packBusy, setPackBusy] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);

  const [filterTopic, setFilterTopic] = useState("");
  const [filterLessonPoint, setFilterLessonPoint] = useState("");
  const [filterPractice, setFilterPractice] = useState("");

  const tagFilters: NotebookTagFilters = useMemo(
    () => ({
      topic: filterTopic,
      lessonPoint: filterLessonPoint,
      practiceExercises: filterPractice,
    }),
    [filterTopic, filterLessonPoint, filterPractice],
  );

  const filtersActive = Boolean(filterTopic.trim() || filterLessonPoint.trim() || filterPractice.trim());

  const kitDocs = useMemo(() => {
    if (scope === "page") {
      if (!filtersActive) return [currentPage];
      return documentMatchesTagFilters(currentPage, tagFilters) ? [currentPage] : [];
    }
    if (!filtersActive) return pages;
    return filterDocumentsByTags(pages, tagFilters);
  }, [scope, pages, currentPage, tagFilters, filtersActive]);

  const total = pages.length;

  useEffect(() => {
    if (scope !== "page") return;
    setPack(null);
    setPackError(null);
  }, [currentPage.id, scope]);

  useEffect(() => {
    setPack(null);
    setPackError(null);
  }, [filterTopic, filterLessonPoint, filterPractice, scope]);

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
    const label =
      filtersActive && kitDocs.length < pages.length
        ? `Cuaderno filtrado (${kitDocs.length} de ${pages.length} archivos)`
        : `Cuaderno (${kitDocs.length} archivos)`;
    return {
      extractedFileText: combined,
      sourceLabel: label,
      uploadedFileCount: kitDocs.length,
      sourceKind: "notes" as const,
      fallbackSeed: combined,
    };
  }, [scope, kitDocs, pages.length, filtersActive]);

  async function generateKit() {
    if (kitDocs.length === 0) return;
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

  const noMatches = kitDocs.length === 0;

  return (
    <div className="mx-auto mt-10 max-w-5xl space-y-4">
      <Card className="border-indigo-400/20 bg-indigo-500/[0.06]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-indigo-100">
            <Sparkles className="h-5 w-5 text-indigo-300" />
            Kit de estudio
          </CardTitle>
          <CardDescription>
            Al subir archivos en Mis cuadernos puedes indicar Tema, Punto y Ejercicios prácticos. Aquí filtras qué hojas
            entran al kit: solo se usa el texto extraído de los archivos que coincidan con todos los campos que
            rellenes (búsqueda por texto contenido).
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

          <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Filtro para el kit</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-xs">
                <span className="text-slate-500">Tema (contiene)</span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-1.5 text-sm text-slate-200 outline-none ring-indigo-400/30 focus:ring"
                  value={filterTopic}
                  onChange={(e) => setFilterTopic(e.target.value)}
                  placeholder="Ej. integrales"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-slate-500">Punto (contiene)</span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-1.5 text-sm text-slate-200 outline-none ring-indigo-400/30 focus:ring"
                  value={filterLessonPoint}
                  onChange={(e) => setFilterLessonPoint(e.target.value)}
                  placeholder="Ej. Tema 3"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-slate-500">Ejercicios (contiene)</span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-1.5 text-sm text-slate-200 outline-none ring-indigo-400/30 focus:ring"
                  value={filterPractice}
                  onChange={(e) => setFilterPractice(e.target.value)}
                  placeholder="Ej. serie A"
                />
              </label>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Vacío = no filtrar en esa columna. Con «Solo esta hoja», la hoja actual debe coincidir con los filtros
              para poder generar.
            </p>
          </div>

          {noMatches ? (
            <p className="text-sm text-amber-200/90">
              Ningún archivo coincide con el filtro. Ajusta Tema / Punto / Ejercicios o vacía los campos para usar todo
              el cuaderno.
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Se usarán <strong className="text-slate-300">{kitDocs.length}</strong> archivo
              {kitDocs.length === 1 ? "" : "s"} en este kit.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" className="gap-2" onClick={() => void generateKit()} disabled={packBusy || noMatches}>
              <Wand2 className="h-4 w-4" />
              {packBusy ? "Generando…" : "Generar kit de estudio"}
            </Button>
            <Link
              href={`/study/library/rescue?subject=${encodeURIComponent(subjectLabel)}&notebook=${encodeURIComponent(subjectSlug)}`}
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
