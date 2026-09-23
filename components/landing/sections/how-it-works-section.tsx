import { CalendarCheck2, Target, UserPlus } from "lucide-react";

const STEPS = [
  {
    icon: UserPlus,
    title: "Crea tu cuenta gratis",
    text: "Sin tarjeta. En menos de un minuto ya estás dentro.",
  },
  {
    icon: CalendarCheck2,
    title: "Recibe tu misión diaria",
    text: "Cada mañana sabes exactamente qué estudiar y en qué orden.",
  },
  {
    icon: Target,
    title: "Practica y aprueba",
    text: "Exámenes de práctica, tarjetas y seguimiento hasta el día del examen.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="border-t border-white/5 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 text-center">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">
            Cómo funciona
          </p>
          <h2 className="mb-6 text-4xl font-bold md:text-5xl">De la duda al plan en 3 pasos</h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="relative rounded-3xl border border-white/10 bg-white/5 p-8"
            >
              <span className="absolute top-6 right-6 text-5xl font-bold text-white/10" aria-hidden>
                {i + 1}
              </span>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                <step.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold">{step.title}</h3>
              <p className="leading-relaxed text-gray-400">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
