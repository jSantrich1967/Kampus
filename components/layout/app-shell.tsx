"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";

import { KampusLogo } from "@/components/brand/kampus-logo";
import { useKampus } from "@/components/kampus/kampus-provider";
import { AttributionBanner } from "@/components/growth/attribution-banner";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useMediaQuery } from "@/hooks/use-media-query";
import { shellThemeFromRole } from "@/lib/layout/shell-theme";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { profile, hydrated } = useKampus();
  const theme = hydrated ? shellThemeFromRole(profile.role) : "student";
  const luminaStudy =
    theme === "student" &&
    (pathname.startsWith("/study/library") ||
      pathname.startsWith("/study/notebook") ||
      pathname.startsWith("/study/flashcards"));

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-kampus-bg text-slate-100">
      {theme === "faculty" ? (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(900px_520px_at_85%_-8%,rgba(20,184,166,0.16),transparent_55%),radial-gradient(780px_420px_at_0%_105%,rgba(6,182,212,0.09),transparent_52%)]"
        />
      ) : null}
      {theme === "institution" ? (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(880px_500px_at_50%_-15%,rgba(245,158,11,0.11),transparent_52%),radial-gradient(720px_400px_at_100%_90%,rgba(99,102,241,0.1),transparent_55%)]"
        />
      ) : null}

      {isDesktop ? (
        <div
          className={cn(
            "md:fixed md:inset-y-0 md:left-0 md:z-10 md:flex md:h-dvh md:w-64 md:shrink-0 md:flex-col md:backdrop-blur",
            luminaStudy && "kampus-lumina-sidebar",
            !luminaStudy && theme === "student" &&
              "md:border-r md:border-white/10 md:bg-slate-950/80 md:bg-gradient-to-b md:from-slate-950 md:to-slate-950/95",
            theme === "faculty" &&
              "md:border-r md:border-teal-400/22 md:bg-slate-950/85 md:bg-gradient-to-b md:from-slate-950 md:via-slate-950/95 md:to-teal-950/35",
            theme === "institution" &&
              "md:border-r md:border-amber-400/25 md:bg-slate-950/85 md:bg-gradient-to-b md:from-slate-950 md:via-slate-950/95 md:to-amber-950/25",
          )}
        >
          <AppSidebar luminaMode={luminaStudy} />
        </div>
      ) : null}

      <div
        className={cn(
          "relative z-[1] min-h-dvh min-w-0 md:pl-64",
          luminaStudy ? "bg-[#0e0e13]" : "bg-kampus-bg",
        )}
      >
        <header
          className={cn(
            "sticky top-0 z-30 flex min-h-[4.25rem] items-center justify-between gap-2 overflow-x-hidden border-b px-3 py-2 backdrop-blur md:hidden",
            theme === "student" && "border-white/10 bg-slate-950/90",
            theme === "faculty" && "border-teal-400/25 bg-slate-950/92",
            theme === "institution" && "border-amber-400/25 bg-slate-950/92",
          )}
        >
          <KampusLogo variant="header" className="shrink-0" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-0.5 min-h-11 min-w-11 shrink-0 touch-manipulation px-2"
            aria-label={open ? "Cerrar navegación" : "Abrir navegación"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>

        {!isDesktop ? (
          <>
            <div
              className={cn(
                "fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm transition md:hidden",
                open ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              onClick={() => setOpen(false)}
            />

            <aside
              className={cn(
                "fixed inset-y-0 left-0 z-50 w-[min(88vw,320px)] border-r bg-slate-950 shadow-2xl transition-transform duration-200 ease-out will-change-transform md:hidden",
                theme === "student" && "border-white/10",
                theme === "faculty" && "border-teal-400/25",
                theme === "institution" && "border-amber-400/25",
                open ? "translate-x-0" : "pointer-events-none -translate-x-full",
              )}
              aria-hidden={!open}
            >
              {open ? <AppSidebar luminaMode={luminaStudy} /> : null}
            </aside>
          </>
        ) : null}

        <Suspense fallback={null}>
          <AttributionBanner />
        </Suspense>
        <main
          className={cn(
            "mx-auto px-4 py-8 pb-16 md:px-8 md:py-10 md:pb-10",
            luminaStudy ? "max-w-7xl" : "max-w-6xl",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
