import { INVESTORS } from "@/lib/landing/content";

export function InvestorsSection() {
  return (
    <section id="inversores" className="border-y border-white/5 bg-white/[0.02] py-12">
      <div className="mx-auto max-w-7xl px-6">
        <p className="mb-10 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
          Nuestros Inversores
        </p>
        <div className="flex flex-wrap justify-center gap-12 opacity-40 grayscale transition-all hover:grayscale-0 md:gap-20">
          {INVESTORS.map((name) => (
            <span key={name} className="flex items-center gap-2 text-xl font-bold">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
