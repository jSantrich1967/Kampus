"use client";

import Link from "next/link";

import { KampusLockup } from "@/components/brand/kampus-mark-svg";
import { SalesContactForm } from "@/components/landing/sales-contact-form";
import { KAMPUS_SALES_EMAIL } from "@/lib/schemas/sales-contact";

export function KampusContactFooter() {
  return (
    <footer id="contacto" className="border-t border-white/5 bg-white/[0.02] py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Link href="/" className="mb-6 inline-flex">
              <KampusLockup className="text-lg sm:text-xl" />
            </Link>
            <h2 className="mb-3 text-3xl font-bold text-white">¿Hablamos?</h2>
            <p className="mb-6 max-w-md leading-relaxed text-gray-400">
              Solicita una demo para tu institución, resuelve dudas sobre licencias o cuéntanos tu proyecto
              educativo. Estamos aquí para ayudarte.
            </p>
            <a
              href={`mailto:${KAMPUS_SALES_EMAIL}`}
              className="inline-flex items-center gap-2 text-purple-400 transition-colors hover:text-purple-300"
            >
              {KAMPUS_SALES_EMAIL}
            </a>

            <div className="mt-10 flex flex-wrap gap-6 text-sm text-gray-400">
              <Link href="/privacidad" className="transition-colors hover:text-white">
                Política de Privacidad
              </Link>
              <Link href="/terminos" className="transition-colors hover:text-white">
                Términos de Servicio
              </Link>
              <Link href="/ayuda" className="transition-colors hover:text-white">
                Centro de Ayuda
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <SalesContactForm compact />
          </div>
        </div>

        <p className="mt-12 border-t border-white/5 pt-8 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} Kampus EdTech. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
