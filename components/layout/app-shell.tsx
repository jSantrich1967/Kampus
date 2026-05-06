"use client";

import { Menu, X } from "lucide-react";
import { Suspense, useState, type ReactNode } from "react";

import { KampusLogo } from "@/components/brand/kampus-logo";
import { useKampus } from "@/components/kampus/kampus-provider";
import { AttributionBanner } from "@/components/growth/attribution-banner";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { shellThemeFromRole } from "@/lib/layout/shell-theme";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { profile, hydrated } = useKampus();
  const theme = hydrated ? shellThemeFromRole(profile.role) : "student";

  return (
    <div className="relative min-h-dvh overflow-x-hidden text-slate-100">
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

      {/* Desktop only: never paint this column on small screens (avoids a “black bar” on phones). */}
      <div
        className={cn(
          "max-md:hidden md:fixed md:inset-y-0 md:left-0 md:z-10 md:flex md:h-dvh md:w-64 md:shrink-0 md:flex-col md:backdrop-blur",
          theme === "student" &&
            "md:border-r md:border-white/10 md:bg-slate-950/80 md:bg-gradient-to-b md:from-slate-950 md:to-slate-950/95",
          theme === "faculty" &&
            "md:border-r md:border-teal-400/22 md:bg-slate-950/85 md:bg-gradient-to-b md:from-slate-950 md:via-slate-950/95 md:to-teal-950/35",
          theme === "institution" &&
            "md:border-r md:border-amber-400/25 md:bg-slate-950/85 md:bg-gradient-to-b md:from-slate-950 md:via-slate-950/95 md:to-amber-950/25",
        )}
      >
        <AppSidebar />
      </div>

      <div className="relative z-[1] min-w-0 md:pl-64">
        <header
          className={cn(
            "sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 backdrop-blur md:hidden",
            theme === "student" && "border-white/10 bg-slate-950/90",
            theme === "faculty" && "border-teal-400/25 bg-slate-950/92",
            theme === "institution" && "border-amber-400/25 bg-slate-950/92",
          )}
        >
          <KampusLogo variant="header" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-2"
            aria-label={open ? "Cerrar navegación" : "Abrir navegación"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>

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
          <AppSidebar onNavigate={() => setOpen(false)} />
        </aside>

        <Suspense fallback={null}>
          <AttributionBanner />
        </Suspense>
        <main className="mx-auto max-w-6xl px-4 py-8 pb-16 md:px-8 md:py-10 md:pb-10">{children}</main>
      </div>
    </div>
  );
}
