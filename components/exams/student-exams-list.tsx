"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ExamPracticePanel } from "@/components/exams/exam-practice-panel";
import { StudentNextExamPanel } from "@/components/exams/student-next-exam-panel";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { useUpcomingExamsSync } from "@/hooks/use-upcoming-exams-sync";
import { buildExamListInsights, pickNextExamInsight } from "@/lib/exams/exam-insights";
import { examsCopy } from "@/lib/i18n/exams";
import { formatAgendaCloudError } from "@/lib/notebooks/storage-errors";
import { seedDemoExamsIfEmpty, loadExams } from "@/lib/storage/exams-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ensureDemoExamsRemote, fetchUserExams } from "@/lib/supabase/agenda-db";
import type { Exam } from "@/lib/schemas/exams";

function daysTone(days: number | null) {
  if (days === null) return "neutral" as const;
  if (days < 0) return "neutral" as const;
  if (days <= 7) return "danger" as const;
  if (days <= 14) return "warning" as const;
  return "success" as const;
}

export function StudentExamsList() {
  const { profile, hydrated, authUserId } = useKampus();
  const t = examsCopy.es;
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const useCloud = Boolean(isSupabaseConfigured() && authUserId);
  useUpcomingExamsSync();

  const load = useCallback(async () => {
    if (!hydrated) return;
    setLoading(true);
    setError(null);
    try {
      if (useCloud) {
        const supabase = createSupabaseBrowserClient();
        await ensureDemoExamsRemote(supabase, authUserId!, profile.subjects[0]);
        const list = await fetchUserExams(supabase, authUserId!);
        setExams(list.filter((e) => e.status !== "draft"));
      } else {
        seedDemoExamsIfEmpty(profile.subjects[0]);
        setExams(loadExams().filter((e) => e.status !== "draft"));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudieron cargar los exámenes.";
      setError(formatAgendaCloudError(msg));
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, [hydrated, useCloud, authUserId, profile.subjects]);

  useEffect(() => {
    void load();
  }, [load]);

  const insights = useMemo(() => buildExamListInsights(exams), [exams]);
  const nextExam = useMemo(() => pickNextExamInsight(insights), [insights]);

  if (!hydrated) return <div className="text-sm text-slate-400">Cargando…</div>;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.listTitle}
        description={useCloud ? t.listDescriptionCloud : t.listDescriptionLocal}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/exams/calendar">
              <Button variant="secondary">{t.calendarCta}</Button>
            </Link>
            <Link href="/pass-mode">
              <Button variant="secondary">{t.passModeCta}</Button>
            </Link>
            <Link href="/today">
              <Button variant="ghost">{t.backTodayCta}</Button>
            </Link>
          </div>
        }
      />

      {isSupabaseConfigured() && !authUserId ? (
        <p className="text-sm text-slate-400">{t.loginHint}</p>
      ) : null}

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t.loading}
        </div>
      ) : null}

      {!loading && nextExam ? <StudentNextExamPanel next={nextExam} /> : null}

      {!loading && nextExam ? <ExamPracticePanel subject={nextExam.exam.subject} /> : null}

      <Card className="border-indigo-400/20 bg-indigo-500/[0.06]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-100">
            <Sparkles className="h-4 w-4" />
            Mi corrección con IA
          </CardTitle>
          <CardDescription>
            Sube tu examen ya resuelto (texto o foto) y recibe qué salió mal, tus temas débiles
            y un plan de 48 horas para reforzarlos.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2 px-6 pb-6">
          <Link href="/exams/mi-correccion">
            <Button size="sm" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Analizar mis errores
            </Button>
          </Link>
        </div>
      </Card>

      {!loading && exams.length === 0 ? <p className="text-sm text-slate-500">{t.empty}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {insights.map(({ exam, daysUntil, estimatedTime }) => (
          <Card key={exam.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-white">{exam.title}</CardTitle>
                <Badge tone={exam.status === "open" ? "success" : "neutral"}>
                  {exam.status === "open" ? t.openBadge : t.closedBadge}
                </Badge>
              </div>
              <CardDescription>
                <span className="text-slate-300">{exam.subject}</span>
                {exam.dueDate ? <span className="text-slate-500"> · {t.dueOn(exam.dueDate)}</span> : null}
              </CardDescription>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="neutral">{t.estimatedTime(estimatedTime)}</Badge>
                {daysUntil !== null ? (
                  <Badge tone={daysTone(daysUntil)}>
                    {daysUntil < 0 ? t.daysOverdue(daysUntil) : t.daysLeft(daysUntil)}
                  </Badge>
                ) : null}
              </div>
              {exam.description ? <p className="mt-2 text-sm text-slate-300">{exam.description}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/exams/student/${exam.id}`}>
                  <Button size="sm">{t.openCta}</Button>
                </Link>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
