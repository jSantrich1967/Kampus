"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RescuePack } from "@/lib/class-rescue";
import { cn } from "@/lib/cn";

function PackSection({
  title,
  description,
  locked,
  children,
}: {
  title: string;
  description?: string;
  locked: boolean;
  children: ReactNode;
}) {
  return (
    <Card className={cn(locked && "relative overflow-hidden")}>
      {locked ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-950/70 p-6 text-center backdrop-blur-sm">
          <div>
            <Badge tone="accent">Premium</Badge>
            <p className="mt-3 text-sm text-slate-200">
              Desbloquea rescates profundos: banco completo de preguntas, exportación de mapa mental y pack de examen.
            </p>
          </div>
        </div>
      ) : null}
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <div className={cn("space-y-3 text-sm text-slate-200", locked && "blur-sm")}>{children}</div>
    </Card>
  );
}

type Props = {
  pack: RescuePack;
  premium: boolean;
  /** e.g. share button + link to pass mode */
  headerActions?: ReactNode;
};

export function RescuePackDisplay({ pack, premium, headerActions }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">Línea de asunto</div>
          <div className="text-lg font-semibold text-white">{pack.subjectLine}</div>
        </div>
        {headerActions ? <div className="flex flex-wrap gap-2">{headerActions}</div> : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <PackSection title="Resumen rápido" locked={false} description="60 segundos de claridad">
          <p>{pack.quickSummary}</p>
        </PackSection>
        <PackSection title="Ideas clave" locked={false} description="Lo que deberías poder explicar">
          <ul className="list-disc space-y-2 pl-5">
            {pack.keyIdeas.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </PackSection>

        <PackSection title="Resumen completo" locked={!premium} description="Nivel guía">
          <p>{pack.fullSummary}</p>
        </PackSection>
        <PackSection title="Explicación profunda" locked={!premium} description="Cadena causal + límites">
          <p>{pack.deepExplanation}</p>
        </PackSection>

        <PackSection title="Probables preguntas de examen" locked={!premium}>
          <ol className="list-decimal space-y-2 pl-5">
            {pack.probableExamQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </PackSection>
        <PackSection title="Tarjetas" locked={!premium}>
          <div className="space-y-3">
            {pack.flashcards.map((c) => (
              <div key={c.front} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">Frente</div>
                <div className="font-medium text-white">{c.front}</div>
                <div className="mt-2 text-xs uppercase tracking-wide text-slate-400">Reverso</div>
                <div className="text-slate-200">{c.back}</div>
              </div>
            ))}
          </div>
        </PackSection>

        <PackSection title="Quiz" locked={!premium}>
          <div className="space-y-4">
            {pack.quiz.map((q, idx) => (
              <div key={q.question} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                <div className="font-medium text-white">
                  {idx + 1}. {q.question}
                </div>
                <ul className="mt-2 space-y-1 text-slate-300">
                  {q.options.map((opt, i) => (
                    <li key={opt} className={cn(i === q.answerIndex && "text-emerald-200")}>
                      {String.fromCharCode(65 + i)}. {opt}
                      {i === q.answerIndex ? " (correcta)" : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </PackSection>

        <PackSection title="Checklist de estudio" locked={false}>
          <ul className="list-disc space-y-2 pl-5">
            {pack.studyChecklist.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </PackSection>

        <PackSection title="Mapa mental (outline)" locked={!premium}>
          <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-200">{pack.mindMapOutline}</pre>
        </PackSection>

        <PackSection title="Explicación fácil" locked={!premium}>
          <p>{pack.easyExplanation}</p>
        </PackSection>
        <PackSection title="Explicación técnica" locked={!premium}>
          <p>{pack.technicalExplanation}</p>
        </PackSection>

        <PackSection title="Preguntas para hacer en clase" locked={!premium}>
          <ul className="list-disc space-y-2 pl-5">
            {pack.questionsForClass.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </PackSection>

        <PackSection title="Siguiente recurso sugerido" locked={false}>
          <p>{pack.suggestedNextResource}</p>
        </PackSection>
      </div>
    </div>
  );
}
