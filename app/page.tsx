import Link from "next/link";
import { redirect } from "next/navigation";
import { 
  ArrowRight, 
  BrainCircuit, 
  ShieldCheck, 
  Sparkles, 
  Users2,
  ChevronRight,
  GraduationCap,
  Command
} from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchProfileForUser } from "@/lib/supabase/profile-sync";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export default async function HomePage() {
  // 1. Auth check (Server side)
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const p = await fetchProfileForUser(supabase, user.id).catch(() => null);
    if (!p?.onboardingFinished) redirect("/onboarding");
    redirect("/today");
  }

  // 2. Landing Page Render (if not logged in)
  return (
    <div className="relative min-h-screen bg-[#030712] text-slate-200 selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] h-[50%] w-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] h-[40%] w-[40%] rounded-full bg-teal-500/5 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] h-[30%] w-[60%] rounded-full bg-indigo-600/5 blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#030712]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-900/20">
              <Command className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Kampus</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Entrar
            </Link>
            <Link href="/register">
              <Button size="sm" className="rounded-full px-5">
                Registrarse
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main>
        <section className="relative px-6 pt-24 pb-20 md:pt-32 md:pb-32">
          <div className="mx-auto max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/5 px-3 py-1 text-xs font-medium text-indigo-300 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <Badge tone="accent" className="h-5">Beta</Badge>
              <span>El futuro del aprendizaje ha llegado</span>
              <ChevronRight className="h-3 w-3" />
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-8 [text-wrap:balance] animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150">
              Tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-400">Sistema Operativo</span> Académico.
            </h1>
            
            <p className="mx-auto max-w-2xl text-lg md:text-xl text-slate-400 mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              La plataforma todo-en-uno que fusiona IA de acompañamiento, gestión de estudios y comunidad para transformar tu éxito universitario.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto text-base rounded-full px-8 py-6 group shadow-xl shadow-indigo-500/20">
                  Comenzar ahora
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto text-base rounded-full px-8 py-6 border-white/10 hover:bg-white/10">
                  Ver demo
                </Button>
              </Link>
            </div>

            {/* App Preview Mockup */}
            <div className="mt-20 relative mx-auto max-w-5xl animate-in fade-in zoom-in-95 duration-1000 delay-700">
              <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-tr from-indigo-500 to-teal-500 opacity-20 blur-2xl" />
              <div className="relative rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-2xl">
                <div className="flex items-center gap-1.5 border-b border-white/5 bg-white/5 px-4 py-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-500/50" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500/50" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/50" />
                  <div className="ml-4 h-4 w-48 rounded-md bg-white/5" />
                </div>
                <div className="p-8 md:p-12 text-left">
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-4 md:col-span-2">
                      <div className="h-8 w-1/3 rounded-lg bg-indigo-500/20" />
                      <div className="h-32 w-full rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
                        <div className="h-4 w-full rounded bg-white/10" />
                        <div className="h-4 w-5/6 rounded bg-white/10" />
                        <div className="h-4 w-4/6 rounded bg-white/10" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-24 rounded-xl border border-white/10 bg-white/5" />
                        <div className="h-24 rounded-xl border border-white/10 bg-white/5" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="h-64 rounded-xl border border-white/10 bg-slate-950/40 p-4 flex flex-col justify-end gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-500" />
                        <div className="h-4 w-full rounded bg-indigo-500/30" />
                        <div className="h-4 w-3/4 rounded bg-indigo-500/30" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-6 py-24 bg-white/[0.02]">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Herramientas diseñadas para ganar</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">Todo lo que necesitas para dominar tu carrera en una sola interfaz inteligente.</p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: BrainCircuit,
                  title: "Tutor IA 24/7",
                  desc: "Explicaciones personalizadas y resolución de dudas instantánea sobre cualquier materia.",
                  color: "text-indigo-400"
                },
                {
                  icon: Sparkles,
                  title: "Modo Aprobar",
                  desc: "Algoritmos que priorizan tu carga de estudio según fechas de exámenes y dificultad.",
                  color: "text-amber-400"
                },
                {
                  icon: ShieldCheck,
                  title: "Apoyo Emocional",
                  desc: "Acompañamiento psicológico por IA para gestionar el estrés y la ansiedad académica.",
                  color: "text-rose-400"
                },
                {
                  icon: Users2,
                  title: "Comunidad Viva",
                  desc: "Conecta con otros estudiantes, comparte apuntes y resuelve problemas en grupo.",
                  color: "text-teal-400"
                }
              ].map((f, i) => (
                <div key={i} className="group p-8 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/[0.08] transition-all duration-300">
                  <div className={cn("mb-4 rounded-xl bg-white/5 w-12 h-12 flex items-center justify-center transition-transform group-hover:scale-110", f.color)}>
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 py-24">
          <div className="mx-auto max-w-4xl rounded-[3rem] border border-indigo-500/20 bg-indigo-500/5 p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-20">
              <GraduationCap className="h-32 w-32 text-indigo-400 rotate-12" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">¿Listo para subir de nivel?</h2>
            <p className="text-lg text-indigo-200/70 mb-10 max-w-xl mx-auto">
              Únete a la beta hoy y forma parte de la nueva generación de estudiantes que aprenden de forma inteligente.
            </p>
            <Link href="/register">
              <Button size="lg" className="rounded-full px-10 py-7 text-lg shadow-2xl shadow-indigo-500/40">
                Crear mi cuenta gratuita
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Command className="h-5 w-5 text-indigo-500" />
            <span className="font-bold text-white uppercase tracking-wider text-sm">Kampus AI</span>
          </div>
          <p className="text-slate-500 text-sm">© {new Date().getFullYear()} Kampus. Hecho para la nueva academia.</p>
          <div className="flex gap-6">
            <Link href="#" className="text-slate-400 hover:text-white transition-colors text-sm">Términos</Link>
            <Link href="#" className="text-slate-400 hover:text-white transition-colors text-sm">Privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
