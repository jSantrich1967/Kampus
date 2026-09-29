"use client";

import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createTaughtCourse, listTaughtCourses, type TaughtCourse } from "@/lib/supabase/courses-db";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { listMyOrganizations } from "@/lib/supabase/organizations-db";
import { canAttachCourseToOrganization } from "@/lib/courses/access";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none";

export function CourseList() {
  const { authUserId, profile, hydrated } = useKampus();
  const [courses, setCourses] = useState<TaughtCourse[]>([]);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hydrated || !authUserId || !isSupabaseConfigured() || profile.role !== "teacher") return;
    const supabase = createSupabaseBrowserClient();
    setLoading(true);
    Promise.all([listTaughtCourses(supabase, authUserId), listMyOrganizations(supabase, authUserId)])
      .then(([rows, memberships]) => {
        setCourses(rows);
        setOrganizations(
          memberships
            .filter((membership) =>
              canAttachCourseToOrganization({
                organizationId: membership.organizationId,
                membershipRole: membership.role,
                membershipStatus: membership.memberStatus,
                organizationStatus: membership.organizationStatus,
              }),
            )
            .map((membership) => ({ id: membership.organizationId, name: membership.name })),
        );
      })
      .catch(() => setError("No se pudieron cargar los cursos."))
      .finally(() => setLoading(false));
  }, [hydrated, authUserId, profile.role]);

  if (!hydrated) return <div className="text-sm text-slate-400">Cargando…</div>;

  if (!authUserId || !isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Docencia" title="Cursos" description="Un curso es tuyo. El aula virtual sigue siendo una clase en vivo." />
        <Card>
          <p className="text-sm text-slate-300">Inicia sesión para crear un curso.</p>
        </Card>
      </div>
    );
  }

  if (profile.role !== "teacher") {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Docencia" title="Cursos" description="Esta pantalla es para quien da el curso." />
        <Card>
          <p className="text-sm text-slate-300">Cambia el rol de pantalla a docente para ver tus cursos.</p>
        </Card>
      </div>
    );
  }

  async function createCourse() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("El nombre necesita al menos 2 letras.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      await createTaughtCourse(supabase, {
        name: trimmed,
        organizationId: organizationId || null,
      });
      setName("");
      setOrganizationId("");
      setCourses(await listTaughtCourses(supabase, authUserId!));
    } catch {
      setError("No se pudo crear el curso. Si acabas de agregar las tablas, recarga e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Docencia"
        title="Cursos"
        description="El curso es tuyo. Los cuadernos de cada persona siguen siendo suyos. El aula virtual no cambia."
      />

      <Card>
        <CardHeader>
          <CardTitle>Nuevo curso</CardTitle>
          <CardDescription>Comparte el código del curso. El alumno lo escribe para quedar inscrito.</CardDescription>
        </CardHeader>
        <div className="space-y-3">
          <input
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej. Biología, sección A"
          />
          {organizations.length > 0 ? (
            <select
              className={inputClass}
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
            >
              <option value="">Sin institución</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          ) : null}
          <Button type="button" onClick={() => void createCourse()} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Crear curso
          </Button>
        </div>
      </Card>

      {error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando cursos…
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-400">Aún no tienes cursos.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <Card key={course.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>{course.name}</CardTitle>
                  <Badge tone={course.status === "active" ? "success" : "neutral"}>
                    {course.status === "active" ? "Activo" : "Archivado"}
                  </Badge>
                </div>
                <CardDescription>
                  {course.organizationName ?? "Sin institución"} · {course.enrolledCount}{" "}
                  {course.enrolledCount === 1 ? "inscrito" : "inscritos"}
                  {course.status === "active" && course.joinCode ? ` · Código ${course.joinCode}` : ""}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
