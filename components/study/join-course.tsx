"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { joinCourseByCode, listEnrolledCourses, type EnrolledCourse } from "@/lib/supabase/courses-db";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none";

export function JoinCourse() {
  const { authUserId, hydrated } = useKampus();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hydrated || !authUserId || !isSupabaseConfigured()) return;
    const supabase = createSupabaseBrowserClient();
    setLoading(true);
    listEnrolledCourses(supabase, authUserId)
      .then(setCourses)
      .catch(() => setError("No se pudieron cargar tus cursos."))
      .finally(() => setLoading(false));
  }, [hydrated, authUserId]);

  if (!hydrated) return <div className="text-sm text-slate-400">Cargando…</div>;

  if (!authUserId || !isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Estudio" title="Mis cursos" description="Entra con el código que te dio tu profesor." />
        <Card>
          <p className="text-sm text-slate-300">Inicia sesión para entrar a un curso.</p>
        </Card>
      </div>
    );
  }

  async function join() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const result = await joinCourseByCode(supabase, code);
      if (result.status === "invalid") {
        setError("Ese código no abre un curso.");
        return;
      }
      if (result.status === "suspended") {
        setError("Tu lugar en ese curso está suspendido. El profesor puede devolverte el lugar.");
        setCourses(await listEnrolledCourses(supabase, authUserId!));
        return;
      }
      if (result.status === "teacher") {
        setError("Ese curso ya es tuyo. No hace falta inscribirte.");
        return;
      }
      if (result.status === "joined" || result.status === "already") {
        setMessage(result.status === "already" ? `Ya estás en ${result.name}.` : `Entraste a ${result.name}.`);
        setCode("");
        setCourses(await listEnrolledCourses(supabase, authUserId!));
      }
    } catch {
      setError("No se pudo entrar al curso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Estudio"
        title="Mis cursos"
        description="El código te inscribe en el curso. Tus cuadernos siguen siendo tuyos."
      />

      <Card>
        <CardHeader>
          <CardTitle>Entrar con un código</CardTitle>
          <CardDescription>Pídeselo a tu profesor. Un curso archivado no acepta el código.</CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className={inputClass}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Ej. AB23CD45"
            autoCapitalize="characters"
          />
          <Button type="button" onClick={() => void join()} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Entrar
          </Button>
        </div>
      </Card>

      {error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando cursos…
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-400">Aún no estás en un curso.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <Card key={course.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>{course.name}</CardTitle>
                  <Badge tone={course.seatStatus === "suspended" ? "warning" : "success"}>
                    {course.seatStatus === "suspended" ? "Suspendido" : "Activo"}
                  </Badge>
                </div>
                <CardDescription>
                  {course.organizationName ?? "Sin institución"}
                  {course.seatStatus === "suspended"
                    ? " · El código no te deja entrar hasta que el profesor te devuelva."
                    : ""}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
