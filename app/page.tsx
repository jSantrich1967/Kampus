import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchProfileForUser } from "@/lib/supabase/profile-sync";

export default async function HomePage() {
  // If the user is already authenticated, keep the existing product flow (onboarding → today).
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const p = await fetchProfileForUser(supabase, user.id).catch(() => null);
    if (!p?.onboardingFinished) redirect("/onboarding");
    redirect("/today");
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <header className="flex items-center justify-between gap-3">
          <div className="font-semibold tracking-tight">Kampus</div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="secondary">Entrar</Button>
            </Link>
            <Link href="/register">
              <Button>Crear cuenta</Button>
            </Link>
          </div>
        </header>

        <section className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-5">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              El sistema operativo académico para estudiar mejor, con menos estrés.
            </h1>
            <p className="text-slate-300">
              Kampus organiza tu día, transforma apuntes en materiales de estudio y te acompaña con herramientas de
              bienestar. Está pensado para estudiantes, docentes e instituciones.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/register">
                <Button>Empezar gratis</Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary">Ya tengo cuenta</Button>
              </Link>
            </div>
            <p className="text-xs text-slate-400">
              Beta: algunas funciones pueden cambiar. Tus datos se protegen con autenticación y políticas RLS en
              Supabase.
            </p>
          </div>

          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>¿Qué puedes hacer hoy?</CardTitle>
              <CardDescription>
                Un vistazo rápido a los módulos principales (sin entrar a la app).
              </CardDescription>
            </CardHeader>
            <div className="grid gap-3 px-6 pb-6 text-sm text-slate-200 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                <div className="font-medium text-white">Plan del día</div>
                <div className="mt-1 text-slate-400">Prioriza tareas y exámenes con claridad.</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                <div className="font-medium text-white">Rescue / Notebook</div>
                <div className="mt-1 text-slate-400">Convierte PDFs y apuntes en kits de estudio.</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                <div className="font-medium text-white">Exposiciones</div>
                <div className="mt-1 text-slate-400">Guía y feedback para practicar presentaciones.</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                <div className="font-medium text-white">Bienestar</div>
                <div className="mt-1 text-slate-400">Diario guiado y acompañamiento psicoeducativo.</div>
              </div>
            </div>
          </Card>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-3">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>Rápido</CardTitle>
              <CardDescription>Cache en cliente (SWR) para que se sienta ágil.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>Seguro</CardTitle>
              <CardDescription>Protección de rutas + RLS para que cada usuario vea lo suyo.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>Observabilidad</CardTitle>
              <CardDescription>Sentry + trazas en rutas OpenAI para detectar fallos y latencia.</CardDescription>
            </CardHeader>
          </Card>
        </section>

        <footer className="mt-14 border-t border-white/10 pt-6 text-xs text-slate-500">
          © {new Date().getFullYear()} Kampus. Hecho con Next.js + Supabase.
        </footer>
      </div>
    </main>
  );
}
