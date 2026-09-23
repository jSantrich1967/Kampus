import { BarChart3, FileCheck2, Shield } from "lucide-react";

export function FeaturesSection() {
  return (
    <section id="funciones" className="py-32">
      <div className="mx-auto mb-20 max-w-7xl px-6 text-center">
        <h2 className="mb-6 text-4xl font-bold md:text-5xl">Todo lo que necesitas para aprobar, en un solo lugar</h2>
        <p className="mx-auto max-w-2xl text-gray-400">
          Kampus organiza tu estudio día a día: qué repasar, cómo practicar y cómo vas avanzando
          hacia tu examen.
        </p>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="group rounded-3xl border border-white/10 bg-white/5 p-8 transition-all hover:bg-white/[0.08] lg:col-span-2">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
            <Shield className="h-6 w-6" />
          </div>
          <h3 className="mb-4 text-2xl font-bold">Tu misión diaria</h3>
          <p className="mb-8 leading-relaxed text-gray-400">
            Cada mañana recibes un plan claro con lo más importante del día, ordenado por
            urgencia: qué repasar, qué practicar y cuánto te falta para estar listo.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800&auto=format&fit=crop"
            alt="Estudiante organizando su plan de estudio del día"
            className="h-64 w-full rounded-2xl border border-white/5 object-cover grayscale transition-all hover:grayscale-0"
          />
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 transition-all hover:bg-white/[0.08]">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h3 className="mb-4 text-2xl font-bold">Tu progreso, a simple vista</h3>
          <p className="leading-relaxed text-gray-400">
            Mira cuánto avanzas por materia y qué tan cerca estás de dominar cada tema antes del
            examen.
          </p>
          <div
            className="relative mt-8 h-44"
            role="img"
            aria-label="Gráfico de ejemplo: horas de estudio por día con tendencia creciente"
          >
            <svg viewBox="0 0 320 176" className="h-full w-full" aria-hidden="true">
              <defs>
                <linearGradient id="kampus-bar-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.55" />
                </linearGradient>
              </defs>
              {[36, 76, 116, 156].map((y) => (
                <line
                  key={y}
                  x1="8"
                  y1={y}
                  x2="312"
                  y2={y}
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="1"
                />
              ))}
              {[
                { x: 22, h: 44, day: "L" },
                { x: 64, h: 68, day: "M" },
                { x: 106, h: 54, day: "X" },
                { x: 148, h: 92, day: "J" },
                { x: 190, h: 78, day: "V" },
                { x: 232, h: 118, day: "S" },
                { x: 274, h: 138, day: "D" },
              ].map((bar) => (
                <g key={bar.day}>
                  <rect
                    x={bar.x}
                    y={156 - bar.h}
                    width="24"
                    height={bar.h}
                    rx="6"
                    fill="url(#kampus-bar-grad)"
                  />
                  <text
                    x={bar.x + 12}
                    y="170"
                    textAnchor="middle"
                    fontSize="10"
                    fill="#9ca3af"
                  >
                    {bar.day}
                  </text>
                </g>
              ))}
              <polyline
                points="34,112 76,88 118,102 160,64 202,78 244,38 286,18"
                fill="none"
                stroke="#e9d5ff"
                strokeWidth="2"
                strokeDasharray="5 4"
                strokeLinecap="round"
              />
              <circle cx="286" cy="18" r="4" fill="#a78bfa" />
            </svg>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 transition-all hover:bg-white/[0.08]">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
            <FileCheck2 className="h-6 w-6" />
          </div>
          <h3 className="mb-4 text-2xl font-bold">Generador de exámenes</h3>
          <p className="leading-relaxed text-gray-400">
            Crea exámenes de práctica de cualquier tema en segundos, con corrección automática y
            explicación de cada respuesta.
          </p>
        </div>

        <div className="group relative overflow-hidden rounded-3xl bg-purple-600 lg:col-span-2">
          <div className="relative z-10 p-8">
            <h3 className="mb-4 text-3xl font-bold">Certificados verificables</h3>
            <p className="max-w-md leading-relaxed text-white/80">
              Al completar tus metas recibes certificados con un código único de verificación,
              listos para compartir con tu familia o tu institución.
            </p>
          </div>
          <Shield className="absolute -right-12 -bottom-12 h-64 w-64 rotate-12 text-white/10 transition-transform group-hover:scale-110" />
        </div>
      </div>
    </section>
  );
}
