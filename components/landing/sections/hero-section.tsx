import Link from "next/link";
import { ArrowRight, CalendarCheck, CheckCircle2, Flame } from "lucide-react";

import { TRUST_ITEMS } from "@/lib/landing/content";

type HeroSectionProps = {
  exploreHref?: string;
};

const TRUST_ICONS = [CheckCircle2, CalendarCheck, Flame] as const;

function ProductMockup() {
  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-full bg-purple-600/20 blur-[120px]" aria-hidden />
      <div className="relative rounded-3xl border border-white/10 bg-[#1a1a20]/95 p-6 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">
            Tu misión de hoy
          </p>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
            3 de 5 listas
          </span>
        </div>
        <p className="mb-4 text-lg font-bold text-white">Jueves: repaso antes del parcial</p>
        <ul className="space-y-3">
          {[
            { label: "Repasar tarjetas de Cálculo", done: true },
            { label: "Practicar 10 ejercicios de derivadas", done: true },
            { label: "Examen de práctica: Física", done: true },
            { label: "Leer resumen de Historia", done: false },
            { label: "Revisar errores del último intento", done: false },
          ].map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  item.done ? "bg-emerald-500/20 text-emerald-300" : "border border-white/20 text-transparent"
                }`}
                aria-hidden
              >
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <span className={`text-sm ${item.done ? "text-gray-500 line-through" : "text-gray-200"}`}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-[11px] text-gray-400">
            <span>Progreso de la semana</span>
            <span className="font-bold text-white">68%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-purple-500 to-purple-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSection({ exploreHref = "#funciones" }: HeroSectionProps) {
  return (
    <section id="inicio" className="kampus-hero-gradient relative overflow-hidden pt-32 pb-20 md:pt-48 md:pb-32">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 md:grid-cols-2">
        <div className="relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-purple-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-500" />
            Tu plan de estudio, listo cada mañana
          </div>

          <h1 className="text-5xl leading-[1.1] font-bold tracking-tight md:text-7xl">
            Deja de adivinar{" "}
            <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
              qué estudiar
            </span>
          </h1>

          <p className="max-w-lg text-lg leading-relaxed text-gray-400">
            Kampus te dice cada día en qué enfocarte, te crea exámenes de práctica y mide tu
            progreso hasta el examen. Empieza gratis, sin tarjeta.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <Link
              href="/demo"
              className="group flex items-center justify-center gap-3 rounded-xl bg-purple-600 px-8 py-4 font-bold text-white transition-all hover:bg-purple-500"
            >
              Probar sin registrarme
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/register"
              className="flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-8 py-4 font-bold transition-all hover:bg-white/10"
            >
              Crear cuenta gratis
            </Link>
          </div>
          <p className="-mt-4 text-sm text-gray-500">
            Gratis para siempre · Sin tarjeta · Funciona en tu navegador
          </p>

          <div className="grid grid-cols-3 gap-8 border-t border-white/5 pt-12">
            {TRUST_ITEMS.map((item, i) => {
              const Icon = TRUST_ICONS[i % TRUST_ICONS.length];
              return (
                <div key={item.label}>
                  <Icon className="mb-2 h-6 w-6 text-purple-400" aria-hidden />
                  <div className="text-sm font-bold text-white">{item.label}</div>
                  <div className="text-xs text-gray-400">{item.sub}</div>
                </div>
              );
            })}
          </div>
        </div>

        <ProductMockup />
      </div>
    </section>
  );
}
