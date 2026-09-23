import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden border-t border-white/5 py-24">
      <div
        className="pointer-events-none absolute inset-0 bg-purple-600/10 blur-[120px]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="mb-6 text-4xl font-bold md:text-5xl">
          Empieza hoy y llega listo a tu próximo examen
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-lg text-gray-400">
          Crea tu cuenta gratis y ten tu primera misión de estudio en 2 minutos. Sin tarjeta,
          sin compromiso.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/register"
            className="group flex items-center justify-center gap-3 rounded-xl bg-purple-600 px-8 py-4 font-bold text-white transition-all hover:bg-purple-500"
          >
            Crear cuenta gratis
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/demo"
            className="flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-8 py-4 font-bold transition-all hover:bg-white/10"
          >
            Ver demo sin registro
          </Link>
        </div>
      </div>
    </section>
  );
}
