"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { seedDemoExamsIfEmpty, loadExams } from "@/lib/storage/exams-storage";

export function StudentExamsList() {
  const { profile, hydrated } = useKampus();
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!hydrated) return;
    seedDemoExamsIfEmpty(profile.subjects[0]);
    setRefresh((v) => v + 1);
  }, [hydrated, profile.subjects]);

  const exams = useMemo(() => {
    void refresh;
    return loadExams().filter((e) => e.status !== "draft");
  }, [refresh]);

  if (!hydrated) return <div className="text-sm text-slate-400">Cargando…</div>;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Evaluación"
        title="Exámenes"
        description="Tus exámenes abiertos, intentos y feedback publicado."
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

