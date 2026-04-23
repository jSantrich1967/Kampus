"use client";

import { Menu, X } from "lucide-react";
import { Suspense, useState, type ReactNode } from "react";

import { KampusLogo } from "@/components/brand/kampus-logo";
import { AttributionBanner } from "@/components/growth/attribution-banner";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh text-slate-100">
      <div className="hidden w-64 shrink-0 border-r border-white/10 bg-slate-950/80 bg-gradient-to-b from-slate-950 to-slate-950/95 backdrop-blur md:fixed md:inset-y-0 md:left-0 md:flex md:flex-col">
        <AppSidebar />
      </div>

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur md:hidden">
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
            "fixed inset-y-0 left-0 z-50 w-[min(88vw,320px)] border-r border-white/10 bg-slate-950 shadow-2xl transition-transform md:hidden",
            open ? "translate-x-0" : "-translate-x-full",
          )}
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
