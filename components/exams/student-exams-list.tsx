"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAgendaCloudError } from "@/lib/notebooks/storage-errors";
import { seedDemoExamsIfEmpty, loadExams } from "@/lib/storage/exams-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ensureDemoExamsRemote, fetchUserExams } from "@/lib/supabase/agenda-db";
import type { Exam } from "@/lib/schemas/exams";

export function StudentExamsList() {
  const { profile, hydrated, authUserId } = useKampus();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const useCloud = Boolean(isSupabaseConfigured() && authUserId);

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

  if (!hydrated) return <div className="text-sm text-slate-400">Cargando…</div>;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Evaluación"
        title="Exámenes"
        description={
          useCloud
            ? "Tus exámenes e intentos se guardan en tu cuenta de Supabase."
            : "Tus exámenes abiertos, intentos y feedback (modo local en el navegador si no hay sesión o Supabase)."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/exams/calendar">
              <Button variant="secondary">Mi calendario</Button>
            </Link>
            <Link href="/today">
              <Button variant="ghost">Volver a Hoy</Button>
            </Link>
          </div>
        }
      />

      {isSupabaseConfigured() && !authUserId ? (
        <p className="text-sm text-slate-400">
          Inicia sesión para cargar tus exámenes desde la nube. Sin sesión, verás el modo demo local en este dispositivo.
        </p>
      ) : null}

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando exámenes…
        </div>
      ) : null}

      {!loading && exams.length === 0 ? (
        <p className="text-sm text-slate-500">No hay exámenes abiertos todavía.</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {exams.map((exam) => (
          <Card key={exam.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-white">{exam.title}</CardTitle>
                <Badge tone={exam.status === "open" ? "success" : "neutral"}>{exam.status === "open" ? "ABIERTO" : "CERRADO"}</Badge>
              </div>
              <CardDescription>
                <span className="text-slate-300">{exam.subject}</span>
                {exam.dueDate ? <span className="text-slate-500"> · vence {exam.dueDate}</span> : null}
              </CardDescription>
              {exam.description ? <p className="mt-2 text-sm text-slate-300">{exam.description}</p> : null}
              <div className="mt-3">
                <Link href={`/exams/student/${exam.id}`}>
                  <Button size="sm">Abrir</Button>
                </Link>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
