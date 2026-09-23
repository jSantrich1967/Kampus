import Link from "next/link";

import { SalesContactButton } from "@/components/landing/sales-contact-form";
import { PRICING_PLANS } from "@/lib/landing/content";

import { BcvPrice, BcvRateNote } from "./bcv-price";

export function PricingSection() {
  return (
    <section id="precios" className="py-32">
      <div className="mx-auto mb-16 max-w-7xl px-6 text-center">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">Precios</p>
        <h2 className="mb-6 text-4xl font-bold md:text-5xl">Planes para cada etapa de tu aprendizaje</h2>
        <p className="mx-auto max-w-2xl text-gray-400">
          Empieza gratis y escala cuando necesites más potencia, analíticas o despliegue institucional.
        </p>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 md:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <article
            key={plan.name}
            className={`flex flex-col rounded-3xl border p-8 transition-all ${
              plan.highlighted
                ? "border-purple-500/50 bg-purple-600/10 shadow-xl shadow-purple-500/10"
                : "border-white/10 bg-white/5 hover:bg-white/[0.08]"
            }`}
          >
            {plan.highlighted ? (
              <span className="mb-4 inline-flex w-fit rounded-full bg-purple-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-purple-300">
                Más popular
              </span>
            ) : null}
            <h3 className="text-xl font-bold">{plan.name}</h3>
            <div className="mt-4 mb-2 flex items-baseline gap-1">
              <span className="text-4xl font-bold">{plan.price}</span>
              {plan.period ? <span className="text-gray-400">{plan.period}</span> : null}
            </div>
            {"usdPrice" in plan && typeof plan.usdPrice === "number" ? (
              <BcvPrice usdPrice={plan.usdPrice} />
            ) : (
              <>
                {"altPrice" in plan && plan.altPrice ? (
                  <p className="text-sm font-semibold text-purple-300">{plan.altPrice}</p>
                ) : null}
                {"priceNote" in plan && plan.priceNote ? (
                  <p className="mb-2 text-xs text-gray-400">{plan.priceNote}</p>
                ) : null}
              </>
            )}
            <p className="mb-8 text-sm leading-relaxed text-gray-400">{plan.description}</p>
            <ul className="mb-8 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" aria-hidden />
                  {feature}
                </li>
              ))}
            </ul>
            {plan.name === "Institución" ? (
              <SalesContactButton className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-center text-sm font-semibold text-white transition-all hover:bg-white/10" />
            ) : (
              <Link
                href="/register"
                className={`rounded-xl px-6 py-3 text-center text-sm font-semibold transition-all ${
                  plan.highlighted
                    ? "bg-purple-600 text-white hover:bg-purple-500"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                Empezar ahora
              </Link>
            )}
          </article>
        ))}
      </div>

      <BcvRateNote />
    </section>
  );
}
