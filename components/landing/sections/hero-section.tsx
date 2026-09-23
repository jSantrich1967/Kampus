import Link from "next/link";
import { Globe, Play } from "lucide-react";

import { HERO_STATS } from "@/lib/landing/content";

type HeroSectionProps = {
  exploreHref?: string;
};

export function HeroSection({ exploreHref = "#funciones" }: HeroSectionProps) {
  return (
    <section id="inicio" className="kampus-hero-gradient relative overflow-hidden pt-32 pb-20 md:pt-48 md:pb-32">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 md:grid-cols-2">
        <div className="relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-purple-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-500" />
            Plataforma educativa con IA
          </div>

          <h1 className="text-5xl leading-[1.1] font-bold tracking-tight md:text-7xl">
            Revolucionando la{" "}
            <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
              educación
            </span>{" "}
            con IA
          </h1>

          <p className="max-w-lg text-lg leading-relaxed text-gray-400">
            Experimenta el futuro del aprendizaje con soluciones educativas online impulsadas por IA.
            Proporcionamos rutas personalizadas que se adaptan al ritmo y potencial de cada estudiante.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <Link
              href="/demo"
              className="group flex items-center justify-center gap-3 rounded-xl bg-purple-600 px-8 py-4 font-bold text-white transition-all hover:bg-purple-500"
            >
              Ver demo
              <Play className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/register"
              className="flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-8 py-4 font-bold transition-all hover:bg-white/10"
            >
              Crear cuenta
            </Link>
            <a
              href={exploreHref}
              className="flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-8 py-4 font-bold transition-all hover:bg-white/10"
            >
              <Globe className="h-5 w-5 text-purple-400" />
              Explorar funciones
            </a>
          </div>

          <div className="grid grid-cols-3 gap-8 border-t border-white/5 pt-12">
            {HERO_STATS.map((stat) => (
              <div key={stat.value}>
                <div className="mb-1 text-3xl font-bold">{stat.value}</div>
                <div className="text-xs uppercase tracking-wider text-gray-400">
                  {stat.label}
                  {stat.sub ? (
                    <>
                      <br />
                      {stat.sub}
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-purple-600/20 blur-[120px]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1000&auto=format&fit=crop"
            alt="Visualización abstracta de inteligencia artificial"
            className="relative rounded-3xl border border-white/10 shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
}
