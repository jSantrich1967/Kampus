"use client";

import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatBlock } from "@/components/ui/stat-block";
import {
  buildCourseSignals,
  buildDifficultTopics,
  buildEngagementSeries,
  buildInstitutionKpis,
} from "@/lib/institution-mock";

function BarRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="text-slate-200">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function InstitutionConsole() {
  const { profile, locale } = useKampus();
  const es = locale === "es";

  if (profile.role !== "institution") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={es ? "Institución" : "Institution"}
          title={es ? "Panel institucional" : "Institution console"}
          description={
            es
              ? "Este panel es para el rol institución. Cambia tu rol en Ajustes (demo) para explorarlo."
              : "This console is for the institution role. Switch your role in Settings (demo) to explore it."
          }
        />
        <Card>
          <CardHeader>
            <CardTitle>{es ? "Acceso restringido" : "Restricted access"}</CardTitle>
            <CardDescription>{es ? "Evita confundir a estudiantes con métricas B2B." : "Avoid showing B2B metrics to students by mistake."}</CardDescription>
          </CardHeader>
          <Link href="/settings">
            <Button variant="secondary">{es ? "Ir a ajustes" : "Go to settings"}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const kpis = buildInstitutionKpis(profile);
  const courses = buildCourseSignals(profile);
  const series = buildEngagementSeries();
  const topics = buildDifficultTopics(profile);

  const retentionTone = kpis.retentionRisk === "high" ? "danger" : kpis.retentionRisk === "medium" ? "warning" : "success";

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={es ? "Institución" : "Institution"}
        title={es ? "Inteligencia de cohorte" : "Cohort intelligence"}
        description={
          es
            ? "Señales creíbles para intervención: riesgo, engagement, tópicos difíciles y consistencia de evaluación (datos demo)."
            : "Credible intervention signals: risk, engagement, difficult topics, and grading consistency (demo data)."
        }
        actions={
          <Badge tone={retentionTone}>
            {es ? "Riesgo retención" : "Retention risk"}: {kpis.retentionRisk}
          </Badge>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatBlock label={es ? "Estudiantes activos (30d)" : "Active students (30d)"} value={kpis.activeStudents.toLocaleString()} />
        <StatBlock label={es ? "Cursos monitoreados" : "Courses monitored"} value={kpis.coursesMonitored} />
        <StatBlock
          label={es ? "Estudiantes en riesgo" : "At-risk students"}
          value={kpis.atRiskStudents.toLocaleString()}
          hint={es ? "Heurística multi-señal (demo)." : "Multi-signal heuristic (demo)."}
        />
        <StatBlock
          label={es ? "Engagement promedio" : "Avg engagement"}
          value={`${kpis.avgEngagement}%`}
          hint={es ? "Basado en sesiones + entregas." : "Based on sessions + submissions."}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{es ? "Rendimiento por curso" : "Course performance"}</CardTitle>
            <CardDescription>{es ? "Drill-down futuro: por sección y por instructor." : "Future drill-down: by section and instructor."}</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="pb-3 pr-3">{es ? "Curso" : "Course"}</th>
                  <th className="pb-3 pr-3">{es ? "Alumnos" : "Students"}</th>
                  <th className="pb-3 pr-3">{es ? "Riesgo" : "At-risk"}</th>
                  <th className="pb-3 pr-3">{es ? "Nota ~" : "Avg score"}</th>
                  <th className="pb-3 pr-3">{es ? "Engage" : "Engage"}</th>
                  <th className="pb-3 pr-3">{es ? "Tema duro" : "Hard topic"}</th>
                  <th className="pb-3">{es ? "Intervención" : "Intervention"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {courses.map((c) => (
                  <tr key={c.courseCode} className="text-slate-200">
                    <td className="py-3 pr-3">
                      <div className="font-medium text-white">{c.courseName}</div>
                      <div className="text-xs text-slate-500">{c.courseCode}</div>
                    </td>
                    <td className="py-3 pr-3">{c.students}</td>
                    <td className="py-3 pr-3">{c.atRiskPct}%</td>
                    <td className="py-3 pr-3">{c.avgScore}</td>
                    <td className="py-3 pr-3">{c.engagementIndex}</td>
                    <td className="py-3 pr-3 text-slate-300">{c.hardestTopic}</td>
                    <td className="py-3 text-slate-300">{c.intervention}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{es ? "Engagement (serie)" : "Engagement (series)"}</CardTitle>
            <CardDescription>{es ? "Vista semanal agregada (demo)." : "Weekly aggregate view (demo)."}</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {series.map((p) => (
              <BarRow key={p.label} label={p.label} value={p.value} />
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
            {es
              ? "Siguiente paso: conectar LMS + asistencia + entregas para que esto deje de ser sintético."
              : "Next step: connect LMS + attendance + submissions so this stops being synthetic."}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{es ? "Tópicos difíciles (agregado)" : "Difficult topics (aggregate)"}</CardTitle>
            <CardDescription>{es ? "Menciones cruzadas entre cursos." : "Cross-course mentions."}</CardDescription>
          </CardHeader>
          <ul className="space-y-3">
            {topics.map((t) => (
              <li key={t.topic} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3">
                <div>
                  <div className="font-medium text-white">{t.topic}</div>
                  <div className="text-xs text-slate-400">
                    {t.mentions} {es ? "menciones" : "mentions"} · {t.courses} {es ? "cursos" : "courses"}
                  </div>
                </div>
                <Badge tone="warning">{es ? "Prioridad" : "Priority"}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{es ? "Patrones de calificación" : "Grading patterns"}</CardTitle>
            <CardDescription>{es ? "Consistencia y fairness (demo)." : "Consistency and fairness (demo)."}</CardDescription>
          </CardHeader>
          <div className="space-y-4 text-sm text-slate-200">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">{es ? "Consistencia índice" : "Consistency index"}</div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                  style={{ width: `${kpis.gradingConsistency}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-slate-400">{kpis.gradingConsistency}/100</div>
            </div>
            <ul className="list-disc space-y-2 pl-5 text-slate-300">
              <li>{es ? "Menos varianza entre secciones en rúbricas compartidas." : "Lower variance across sections when rubrics are shared."}</li>
              <li>{es ? "Picos de calificaciones tardías correlacionan con caída de engagement." : "Late grading spikes correlate with engagement drops."}</li>
              <li>{es ? "Micro-quizzes reducen preguntas repetidas en foros." : "Micro-quizzes reduce repeated forum questions."}</li>
            </ul>
            <Link href="/risk">
              <Button variant="secondary" size="sm">
                {es ? "Ver radar académico" : "Open academic radar"}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
