"use client";

import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { KampusLockup } from "@/components/brand/kampus-mark-svg";
import { cn } from "@/lib/cn";

const NAV_LINKS = [
  { href: "#inicio", label: "Nosotros" },
  { href: "#funciones", label: "Funciones" },
  { href: "#testimonios", label: "Testimonios" },
  { href: "#precios", label: "Precios" },
  { href: "#contacto", label: "Contacto" },
] as const;

export function KampusLuminaNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <nav className="kampus-glass-nav fixed top-0 z-50 w-full">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="inline-flex items-center" onClick={closeMenu}>
          <KampusLockup className="text-lg sm:text-xl" />
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium text-gray-400 md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} className="transition-colors hover:text-white">
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="group hidden items-center gap-2 rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-purple-500 sm:flex"
          >
            Log In
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10 md:hidden"
            aria-expanded={open}
            aria-controls="kampus-mobile-menu"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        id="kampus-mobile-menu"
        className={cn(
          "fixed inset-0 top-[73px] z-40 md:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
          aria-label="Cerrar menú"
          onClick={closeMenu}
        />

        <div
          className={cn(
            "relative border-b border-white/5 bg-[#131318]/95 px-6 py-6 backdrop-blur-xl transition-all duration-300",
            open ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0",
          )}
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-xl px-4 py-3 text-base font-medium text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                onClick={closeMenu}
              >
                {link.label}
              </a>
            ))}
          </div>

          <Link
            href="/login"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-purple-500"
            onClick={closeMenu}
          >
            Log In
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

export { NAV_LINKS };
