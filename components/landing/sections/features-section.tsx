import { BarChart3, Globe, Shield } from "lucide-react";

export function FeaturesSection() {
  return (
    <section id="funciones" className="py-32">
      <div className="mx-auto mb-20 max-w-7xl px-6 text-center">
        <h2 className="mb-6 text-4xl font-bold md:text-5xl">Eleva tu viaje de aprendizaje</h2>
        <p className="mx-auto max-w-2xl text-gray-400">
          Construido con redes neuronales de vanguardia para entender tu estilo de aprendizaje y objetivos
          únicos.
        </p>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="group rounded-3xl border border-white/10 bg-white/5 p-8 transition-all hover:bg-white/[0.08] lg:col-span-2">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
            <Shield className="h-6 w-6" />
          </div>
          <h3 className="mb-4 text-2xl font-bold">Motor de CI Adaptativo</h3>
          <p className="mb-8 leading-relaxed text-gray-400">
            Nuestra IA analiza tu rendimiento en tiempo real, ajustando la dificultad y el estilo del
            contenido para maximizar la retención.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop"
            alt="Tecnología de inteligencia artificial aplicada al aprendizaje"
            className="h-64 w-full rounded-2xl border border-white/5 object-cover grayscale transition-all hover:grayscale-0"
          />
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 transition-all hover:bg-white/[0.08]">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h3 className="mb-4 text-2xl font-bold">Análisis de Progreso</h3>
          <p className="leading-relaxed text-gray-400">
            Visualiza tu crecimiento con analíticas predictivas que muestran exactamente cuándo dominarás un
            tema.
          </p>
          <div className="relative mt-12 h-40 border-l border-purple-500/30">
            <div className="absolute bottom-0 left-0 h-1/2 w-full bg-purple-500/10 blur-xl" />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 transition-all hover:bg-white/[0.08]">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
            <Globe className="h-6 w-6" />
          </div>
          <div className="mb-2 text-4xl font-bold">120+</div>
          <div className="text-sm font-bold uppercase tracking-widest text-gray-500">Idiomas</div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl bg-purple-600 lg:col-span-2">
          <div className="relative z-10 p-8">
            <h3 className="mb-4 text-3xl font-bold">Maestría Certificada</h3>
            <p className="max-w-md leading-relaxed text-white/80">
              Certificaciones respaldadas por blockchain reconocidas globalmente al completar rutas de
              aprendizaje críticas.
            </p>
          </div>
          <Shield className="absolute -right-12 -bottom-12 h-64 w-64 rotate-12 text-white/10 transition-transform group-hover:scale-110" />
        </div>
      </div>
    </section>
  );
}
