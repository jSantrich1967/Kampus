"use client";

import { CheckCircle2, Circle, Compass, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import {
  clearDemoBrowser,
  dismissDemoGuide,
  isDemoBrowser,
  isDemoGuideDismissed,
  loadDemoGuideVisited,
  markDemoGuideVisited,
} from "@/lib/demo/demo-session";
import { cn } from "@/lib/cn";

const STEPS = [
  {
    id: "mission",
    title: "Mira tu misión de hoy",
    hint: "El plan del día se arma solo según tus exámenes.",
    href: "/today",
  },
  {
    id: "cram",
    title: "Prueba el Modo examen",
    hint: "Diagnóstico de 2 minutos y plan de estudio por días.",
    href: "/modo-examen",
  },
  {
    id: "tutor",
    title: "Pregúntale al Tutor IA",
    hint: "Te guía con preguntas, no te regala la tarea.",
    href: "/tutor",
  },
  {
    id: "exams",
    title: "Revisa tus exámenes y el calendario",
    hint: "Fechas, avisos y el examen más cercano en un solo lugar.",
    href: "/exams/calendar",
  },
  {
    id: "community",
    title: "Pasa por la Comunidad",
    hint: "Preguntas y resúmenes de tu materia con otros estudiantes.",
    href: "/community",
  },
] as const;

/**
 * Recorrido guiado de la demo: solo aparece en sesiones demo (sin cuenta
 * real) y lleva de la mano por las acciones clave. Nada de lo que se haga
 * aquí se guarda en un servidor: vive en este navegador.
 */
export function DemoGuideCard() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [visited, setVisited] = useState<string[]>([]);

  useEffect(() => {
    if (isDemoBrowser() && !isDemoGuideDismissed()) {
      setVisited(loadDemoGuideVisited());
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const doneCount = STEPS.filter((s) => visited.includes(s.id)).length;

  return (
    <Card className="border-purple-400/25 bg-purple-500/[0.06]">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-purple-100">
              <Compass className="h-4 w-4" aria-hidden />
              Recorrido guiado de la demo
            </CardTitle>
            <CardDescription>
              Estás probando Kampus sin cuenta: nada de lo que hagas aquí se guarda en un
              servidor. {doneCount} de {STEPS.length} pasos.
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={() => {
              dismissDemoGuide();
              setVisible(false);
            }}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Cerrar recorrido guiado"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </CardHeader>
      <div className="space-y-2 px-6 pb-4">
        {STEPS.map((step, i) => {
          const done = visited.includes(step.id);
          return (
            <Link
              key={step.id}
              href={step.href}
              onClick={() => {
                markDemoGuideVisited(step.id);
                setVisited((v) => (v.includes(step.id) ? v : [...v, step.id]));
              }}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 transition hover:border-purple-400/40 hover:bg-black/30",
                done && "opacity-70",
              )}
            >
              {done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-white">
                  {i + 1}. {step.title}
                </span>
                <span className="block text-xs text-slate-400">{step.hint}</span>
              </span>
            </Link>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3 px-6 pb-6">
        <button
          type="button"
          className={buttonClasses({ size: "sm" })}
          onClick={() => {
            clearDemoBrowser();
            router.push("/register");
          }}
        >
          Crear mi cuenta gratis
        </button>
        <span className="text-xs text-slate-500">
          Al registrarte, tu progreso real empieza desde cero, con tus materias.
        </span>
      </div>
    </Card>
  );
}
