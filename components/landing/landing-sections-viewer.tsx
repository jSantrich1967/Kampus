"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";

import { KampusContactFooter } from "@/components/landing/kampus-contact-footer";
import { KampusLuminaNav } from "@/components/landing/kampus-lumina-nav";
import { FeaturesSection } from "@/components/landing/sections/features-section";
import { HeroSection } from "@/components/landing/sections/hero-section";
import { InvestorsSection } from "@/components/landing/sections/investors-section";
import { PricingSection } from "@/components/landing/sections/pricing-section";
import { TestimonialsSection } from "@/components/landing/sections/testimonials-section";
import { cn } from "@/lib/cn";
import { LANDING_SECTIONS, type LandingSectionId } from "@/lib/landing/content";

const PREVIEWABLE = LANDING_SECTIONS.filter((s) => !("href" in s && s.href));

function isSectionId(value: string | null): value is LandingSectionId {
  return PREVIEWABLE.some((s) => s.id === value);
}

function SectionCanvas({ sectionId }: { sectionId: LandingSectionId }) {
  switch (sectionId) {
    case "nav":
      return <KampusLuminaNav />;
    case "hero":
      return <HeroSection exploreHref="#" />;
    case "inversores":
      return <InvestorsSection />;
    case "funciones":
      return <FeaturesSection />;
    case "testimonios":
      return <TestimonialsSection />;
    case "precios":
      return <PricingSection />;
    case "contacto":
      return <KampusContactFooter />;
    default:
      return null;
  }
}

function SectionsViewerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get("s");
  const activeId: LandingSectionId = isSectionId(raw) ? raw : "hero";

  const activeIndex = PREVIEWABLE.findIndex((s) => s.id === activeId);
  const active = PREVIEWABLE[activeIndex] ?? PREVIEWABLE[0];
  const prev = PREVIEWABLE[activeIndex - 1];
  const next = PREVIEWABLE[activeIndex + 1];

  const goTo = useCallback(
    (id: LandingSectionId) => {
      router.push(`/preview/secciones?s=${id}`, { scroll: false });
    },
    [router],
  );

  return (
    <div className="flex min-h-dvh flex-col bg-[#0a0a0d] text-white">
      <header className="sticky top-0 z-[60] border-b border-white/10 bg-[#131318]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Landing completa
            </Link>
            <span className="hidden text-gray-600 sm:inline">|</span>
            <p className="text-sm font-semibold text-purple-300">Visor de secciones</p>
          </div>

          <div className="flex items-center gap-2">
            {prev ? (
              <button
                type="button"
                onClick={() => goTo(prev.id)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/10"
              >
                ← {prev.label}
              </button>
            ) : null}
            {next ? (
              <button
                type="button"
                onClick={() => goTo(next.id)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/10"
              >
                {next.label} →
              </button>
            ) : null}
          </div>
        </div>

        <div className="border-t border-white/5 px-4 py-2">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto pb-1">
            {LANDING_SECTIONS.map((section) => {
              if ("href" in section && section.href) {
                return (
                  <Link
                    key={section.id}
                    href={section.href}
                    className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {section.label}
                    <ExternalLink className="ml-1 inline h-3 w-3 opacity-60" />
                  </Link>
                );
              }

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => goTo(section.id)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    activeId === section.id
                      ? "bg-purple-600 text-white"
                      : "border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="border-b border-purple-500/20 bg-purple-500/10 px-4 py-2 text-center text-xs text-purple-200">
        Viendo: <strong className="text-white">{active.label}</strong>
        <span className="mx-2 text-purple-400/60">·</span>
        <code className="text-purple-300">components/landing/{active.file}</code>
      </div>

      <div className="flex-1 overflow-x-hidden bg-[#131318]">
        <SectionCanvas sectionId={activeId} />
      </div>

      <footer className="border-t border-white/10 bg-[#131318] px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 text-xs text-gray-500">
          <span>
            Sección {activeIndex + 1} de {PREVIEWABLE.length}
          </span>
          {next ? (
            <button
              type="button"
              onClick={() => goTo(next.id)}
              className="flex items-center gap-1 text-purple-400 hover:text-purple-300"
            >
              Siguiente: {next.label}
              <ArrowRight className="h-3 w-3" />
            </button>
          ) : (
            <Link href="/" className="text-purple-400 hover:text-purple-300">
              Ver landing completa
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}

export function LandingSectionsViewer() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#131318] text-gray-400">
          Cargando visor…
        </div>
      }
    >
      <SectionsViewerInner />
    </Suspense>
  );
}
