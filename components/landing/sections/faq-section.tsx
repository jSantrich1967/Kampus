import { FAQS } from "@/lib/landing/content";

export function FaqSection() {
  return (
    <section id="preguntas" className="py-32">
      <div className="mx-auto mb-16 max-w-7xl px-6 text-center">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">FAQ</p>
        <h2 className="mb-6 text-4xl font-bold md:text-5xl">Preguntas frecuentes</h2>
        <p className="mx-auto max-w-2xl text-gray-400">
          Lo que más nos preguntan estudiantes, docentes e instituciones.
        </p>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 px-6">
        {FAQS.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-2xl border border-white/10 bg-white/5 px-6 py-5 transition-colors open:bg-white/[0.07]"
          >
            <summary className="cursor-pointer list-none text-base font-semibold text-white [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-4">
                {faq.question}
                <span
                  className="shrink-0 text-xl leading-none text-purple-400 transition-transform duration-300 group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
