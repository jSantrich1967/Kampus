"use client";

import { AlertTriangle, Download, Send, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { PageHeader } from "@/components/layout/page-header";
import { SectionProntoBanner } from "@/components/layout/section-pronto-banner";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildRubricFromPrompt, detectCommonIssues, suggestFeedback, suggestScore, type RubricRow } from "@/lib/teacher-copilot";
type Workflow = "draft" | "review" | "published";

export function TeacherCopilotWorkspace() {
  const { profile } = useKampus();

  const [assignment, setAssignment] = useState("Ensayo corto: defiende tu tesis con dos evidencias.");
  const [answer, setAnswer] = useState(
    "La tesis es importante porque ayuda. Obviamente es claro que la evidencia respalda todo.",
  );
  const [rubric, setRubric] = useState<RubricRow[]>([]);
  const [copilotFeedback, setCopilotFeedback] = useState("");
  const [workflow, setWorkflow] = useState<Workflow>("draft");

  const scorePreview = useMemo(() => suggestScore(answer), [answer]);
  const issues = useMemo(() => detectCommonIssues(answer), [answer]);

  function generateRubric() {
    setRubric(buildRubricFromPrompt(assignment));
    setWorkflow("review");
  }

  function applyCopilot() {
    setCopilotFeedback(suggestFeedback(answer));
  }

  function exportGradesCsv() {
    const rows = [
      ["student_id", "score", "status"],
      ["demo_student", String(scorePreview.score), workflow],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replaceAll('"', '\\"')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kampus_grade_export_demo.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (profile.role !== "teacher") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Docencia"
          title="Copiloto de evaluación"
          description="Cambia tu rol a docente en onboarding o ajustes (demo)."
        />
        <Card>
          <CardHeader>
            <CardTitle>Solo docentes</CardTitle>
            <CardDescription>
              Este flujo está pensado para ahorrar tiempo en corrección.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Docencia"
        title="Copiloto de evaluación"
        description="Rúbrica, revisión de respuesta, feedback sugerido y publicación — tú editas, tú decides, tú publicas."
        actions={
          <ShareLinkButton
            pathname="/teaching"
            campaign="teacher_workflow"
            refHandle={profile.university || "kampus"}
            label="Compartir flujo docente"
            copiedLabel="Copiado"
          />
        }
      />

      <SectionProntoBanner kind="teacher" />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={workflow === "draft" ? "neutral" : workflow === "review" ? "warning" : "success"}>
          {workflow === "draft" ? "Borrador" : workflow === "review" ? "Revisión" : "Publicado"}
        </Badge>
        <Button type="button" size="sm" variant="secondary" onClick={() => setWorkflow("draft")}>
          Marcar borrador
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => setWorkflow("review")}>
          Enviar a revisión
        </Button>
        <Button type="button" size="sm" variant="primary" onClick={() => setWorkflow("published")} className="gap-1">
          <Send className="h-4 w-4" />
          Publicar a alumnos
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contexto del examen / tarea</CardTitle>
            <CardDescription>Esto alimenta la rúbrica sugerida.</CardDescription>
          </CardHeader>
          <textarea
            className="mx-5 mb-5 min-h-32 w-[calc(100%-2.5rem)] rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            value={assignment}
            onChange={(e) => setAssignment(e.target.value)}
          />
          <div className="px-5 pb-5">
            <Button type="button" onClick={generateRubric} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generar rúbrica
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Respuesta del alumno (demo)</CardTitle>
            <CardDescription>Pega texto real cuando conectes LMS.</CardDescription>
          </CardHeader>
          <textarea
            className="mx-5 mb-5 min-h-32 w-[calc(100%-2.5rem)] rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <div className="flex flex-wrap gap-2 px-5 pb-5">
            <Button type="button" variant="secondary" onClick={applyCopilot} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Sugerir feedback
            </Button>
            <Button type="button" variant="ghost" onClick={exportGradesCsv} className="gap-2">
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rúbrica (editable)</CardTitle>
            <CardDescription>Ajusta pesos y guías antes de publicar.</CardDescription>
          </CardHeader>
          <div className="space-y-3 px-5 pb-5">
            {rubric.length === 0 ? (
              <p className="text-sm text-slate-400">Aún no generada.</p>
            ) : (
              rubric.map((row, idx) => (
                <div key={row.criterion} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-white">{row.criterion}</div>
                    <input
                      type="number"
                      className="w-20 rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1 text-sm"
                      value={row.points}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setRubric((prev) => prev.map((r, i) => (i === idx ? { ...r, points: v } : r)));
                      }}
                    />
                  </div>
                  <textarea
                    className="mt-2 min-h-16 w-full rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1 text-xs text-slate-200"
                    value={row.guidance}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRubric((prev) => prev.map((r, i) => (i === idx ? { ...r, guidance: v } : r)));
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sugerencias y riesgos</CardTitle>
            <CardDescription>Heurística local — sustituir por modelo + reglas del curso.</CardDescription>
          </CardHeader>
          <div className="space-y-4 px-5 pb-5 text-sm text-slate-200">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-400">Calificación sugerida</div>
              <div className="mt-1 text-2xl font-semibold text-white">
                {scorePreview.score}
                <span className="text-base text-slate-400">/100</span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{scorePreview.rationale}</p>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Patrones detectados</div>
              {issues.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">Sin señales obvias en este texto.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {issues.map((i) => (
                    <li key={i} className="flex items-start gap-2 rounded-lg border border-amber-300/20 bg-amber-400/5 px-3 py-2 text-amber-50">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Borrador de feedback</div>
              <textarea
                className="mt-2 min-h-32 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
                placeholder="Pulsa “Sugerir feedback”."
                value={copilotFeedback}
                onChange={(e) => setCopilotFeedback(e.target.value)}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
