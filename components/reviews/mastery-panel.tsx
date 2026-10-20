"use client";

import { useEffect, useState } from "react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type TopicMastery = { topic: string; pct: number | null; uncertain?: boolean };
type SubjectMastery = { subject: string; topics: TopicMastery[] };

function barColor(pct: number): string {
  if (pct >= 70) return "bg-emerald-400";
  if (pct >= 40) return "bg-amber-400";
  return "bg-rose-400";
}

/**
 * Tablero de dominio por tema. El % viene del servidor (60% último
 * diagnóstico + 40% repasos de 30 días); pct null = "sin datos", nunca
 * un porcentaje inventado.
 */
export function MasteryPanel() {
  const [subjects, setSubjects] = useState<SubjectMastery[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/reviews/mastery")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive) setSubjects(Array.isArray(j?.subjects) ? j.subjects : []);
      })
      .catch(() => {
        if (alive) setSubjects([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (subjects === null) {
    return <div className="text-sm text-slate-400">Cargando tu dominio…</div>;
  }

  if (subjects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tu dominio por materia</CardTitle>
          <CardDescription>
            Todavía no hay datos. Haz un diagnóstico en Modo examen o repasa tarjetas y aquí verás
            tu dominio real por tema.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-50">Tu dominio por materia</h2>
        <p className="text-sm text-slate-400">
          Combina tu último diagnóstico con cómo te va en los repasos.
        </p>
      </div>
      {subjects.map((s) => (
        <Card key={s.subject}>
          <CardHeader>
            <CardTitle>{s.subject}</CardTitle>
          </CardHeader>
          <div className="space-y-3 px-5 pb-5">
            {s.topics.map((t) => (
              <div key={t.topic}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-200">{t.topic}</span>
                  {t.pct === null ? (
                    <span className="text-xs text-slate-500">Sin datos todavía</span>
                  ) : (
                    <span className="font-semibold text-slate-100">
                      {t.pct}%{t.uncertain ? " · muestra chica" : ""}
                    </span>
                  )}
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  {t.pct !== null ? (
                    <div
                      className={`h-full rounded-full ${barColor(t.pct)}`}
                      style={{ width: `${t.pct}%` }}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
