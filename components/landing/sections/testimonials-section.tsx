import { Quote, Star } from "lucide-react";

import { TESTIMONIALS } from "@/lib/landing/content";

export function TestimonialsSection() {
  return (
    <section id="testimonios" className="border-t border-white/5 bg-white/[0.02] py-32">
      <div className="mx-auto mb-16 max-w-7xl px-6 text-center">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">Testimonios</p>
        <h2 className="mb-6 text-4xl font-bold md:text-5xl">Lo que dicen quienes aprenden con Kampus</h2>
        <p className="mx-auto max-w-2xl text-gray-400">
          Estudiantes, docentes e instituciones que ya transformaron su forma de enseñar y aprender.
        </p>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 md:grid-cols-2 lg:grid-cols-3">
        {TESTIMONIALS.map((item) => (
          <article
            key={item.name}
            className="flex flex-col rounded-3xl border border-white/10 bg-white/5 p-8 transition-all hover:bg-white/[0.08]"
          >
            <Quote className="mb-6 h-8 w-8 text-purple-400/80" aria-hidden />
            <p className="mb-8 flex-1 leading-relaxed text-gray-300">&ldquo;{item.quote}&rdquo;</p>
            <div className="flex items-center gap-1 text-purple-400" aria-label={`${item.rating} de 5 estrellas`}>
              {Array.from({ length: item.rating }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" aria-hidden />
              ))}
            </div>
            <div className="mt-4 border-t border-white/5 pt-4">
              <p className="font-semibold text-white">{item.name}</p>
              <p className="text-sm text-gray-400">{item.role}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
