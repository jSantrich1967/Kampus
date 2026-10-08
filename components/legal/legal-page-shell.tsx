import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { KampusLockup } from "@/components/brand/kampus-mark-svg";

type LegalPageShellProps = {
  title: string;
  updated: string;
  children: ReactNode;
};

export function LegalPageShell({ title, updated, children }: LegalPageShellProps) {
  return (
    <div className="min-h-dvh bg-[#131318] text-white">
      <header className="border-b border-white/5">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/" className="inline-flex items-center" aria-label="Kampus — Inicio">
            <KampusLockup className="text-lg" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver al inicio
          </Link>
        </div>
      </header>

      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Saltar al contenido
      </a>

      <main id="contenido" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="mb-3 text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mb-10 text-sm text-gray-400">Última actualización: {updated}</p>
        <div className="space-y-8 text-[15px] leading-relaxed text-gray-300">{children}</div>
      </main>

      <footer className="border-t border-white/5">
        <p className="mx-auto max-w-3xl px-6 py-8 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Kampus EdTech. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
