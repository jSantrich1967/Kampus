"use client";

import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmissionDelivery } from "@/components/study/submission-delivery";
import { canArchiveCourse, canAttachCourseToOrganization } from "@/lib/courses/access";
import { parseCourseGrade } from "@/lib/study/course-grade";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { archiveTaughtCourse, createTaughtCourse, listCourseSeats, listTaughtCourses, setCourseSeatStatus, type CourseSeat, type TaughtCourse } from "@/lib/supabase/courses-db";
import { listCourseSubmissions, reviewStudentWork, type CourseSubmission } from "@/lib/supabase/teacher-student-db";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { listMyOrganizations } from "@/lib/supabase/organizations-db";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none";
const areaClass = `${inputClass} min-h-24`;

export function CourseList() {
  const { authUserId, profile, hydrated } = useKampus();
  const [courses, setCourses] = useState<TaughtCourse[]>([]);
  const [seats, setSeats] = useState<CourseSeat[]>([]);
  const [submissions, setSubmissions] = useState<CourseSubmission[]>([]);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [openReviewId, setOpenReviewId] = useState<string | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { feedback: string; grade: string }>>({});
  const [savingReviewId, setSavingReviewId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hydrated || !authUserId || !isSupabaseConfigured() || profile.role !== "teacher") return;
    const supabase = createSupabaseBrowserClient();
    setLoading(true);
    Promise.all([listTaughtCourses(supabase, authUserId), listMyOrganizations(supabase, authUserId)])
      .then(async ([rows, memberships]) => {
        setCourses(rows);
        setSeats(await listCourseSeats(supabase, rows.map((course) => course.id)));
        setSubmissions(await listCourseSubmissions(supabase, rows.map((course) => course.id)));
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
      const rows = await listTaughtCourses(supabase, authUserId!);
      setCourses(rows);
      setSeats(await listCourseSeats(supabase, rows.map((course) => course.id)));
      setSubmissions(await listCourseSubmissions(supabase, rows.map((course) => course.id)));
    } catch {
      setError("No se pudo crear el curso. Si acabas de agregar las tablas, recarga e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function archiveCourse(course: TaughtCourse) {
    if (!canArchiveCourse(course.status)) return;
    if (!window.confirm(`¿Archivar «${course.name}»? El código dejará de servir. El curso no se borra.`)) return;
    setError("");
    setArchivingId(course.id);
    try {
      const supabase = createSupabaseBrowserClient();
      await archiveTaughtCourse(supabase, course.id);
      setCourses((current) =>
        current.map((item) => (item.id === course.id ? { ...item, status: "archived" } : item)),
      );
    } catch {
      setError("No se pudo archivar el curso.");
    } finally {
      setArchivingId(null);
    }
  }

  async function changeSeat(seat: CourseSeat) {
    const course = courses.find((item) => item.id === seat.courseId);
    if (!course || !canArchiveCourse(course.status)) return;
    const next = seat.status === "active" ? "suspended" : "active";
    if (next === "suspended" && !window.confirm(`¿Suspender a ${seat.displayName}? El código ya no le servirá.`)) {
      return;
    }
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      await setCourseSeatStatus(supabase, seat.courseId, seat.userId, next);
      setSeats((current) =>
        current.map((item) =>
          item.courseId === seat.courseId && item.userId === seat.userId ? { ...item, status: next } : item,
        ),
      );
    } catch {
      setError("No se pudo cambiar el asiento.");
    }
  }

  function openReview(item: CourseSubmission) {
    setError("");
    setOpenReviewId((current) => (current === item.id ? null : item.id));
    setReviewDrafts((current) =>
      current[item.id]
        ? current
        : {
            ...current,
            [item.id]: {
              feedback: item.feedback,
              grade: item.grade === null ? "" : String(item.grade),
            },
          },
    );
  }

  async function saveReview(item: CourseSubmission) {
    const draft = reviewDrafts[item.id] ?? { feedback: item.feedback, grade: item.grade === null ? "" : String(item.grade) };
    const parsed = parseCourseGrade(draft.grade);
    if (!parsed.ok) return;
    setError("");
    setSavingReviewId(item.id);
    try {
      const supabase = createSupabaseBrowserClient();
      await reviewStudentWork(supabase, item.id, { feedback: draft.feedback, grade: parsed.grade });
      setSubmissions((current) =>
        current.map((row) =>
          row.id === item.id
            ? { ...row, status: "reviewed", feedback: draft.feedback.trim(), grade: parsed.grade }
            : row,
        ),
      );
      setOpenReviewId(null);
    } catch {
      setError("No se pudo guardar la corrección.");
    } finally {
      setSavingReviewId(null);
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
          {courses.map((course) => {
            const courseSeats = seats.filter((seat) => seat.courseId === course.id);
            const activeCount = courseSeats.filter((seat) => seat.status === "active").length;
            const courseSubmissions = submissions.filter((item) => item.courseId === course.id);
            return (
            <Card key={course.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>{course.name}</CardTitle>
                  <Badge tone={course.status === "active" ? "success" : "neutral"}>
                    {course.status === "active" ? "Activo" : "Archivado"}
                  </Badge>
                </div>
                <CardDescription>
                  {course.organizationName ?? "Sin institución"} · {activeCount}{" "}
                  {activeCount === 1 ? "inscrito" : "inscritos"}
                  {course.status === "active" && course.joinCode ? ` · Código ${course.joinCode}` : ""}
                  {course.status === "archived" ? " · El código ya no acepta alumnos." : ""}
                </CardDescription>
              </CardHeader>
              {canArchiveCourse(course.status) ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void archiveCourse(course)}
                  disabled={archivingId === course.id}
                >
                  {archivingId === course.id ? "Archivando…" : "Archivar"}
                </Button>
              ) : null}
              <div className="space-y-2">
                {courseSeats.length === 0 ? (
                  <p className="text-sm text-slate-400">Nadie ha entrado con el código.</p>
                ) : (
                  courseSeats.map((seat) => (
                    <div key={seat.userId} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm text-slate-200">{seat.displayName}</span>
                      <div className="flex items-center gap-2">
                        <Badge tone={seat.status === "active" ? "success" : "warning"}>
                          {seat.status === "active" ? "Activo" : "Suspendido"}
                        </Badge>
                        {canArchiveCourse(course.status) ? (
                          <Button type="button" size="sm" variant="secondary" onClick={() => void changeSeat(seat)}>
                            {seat.status === "active" ? "Suspender" : "Devolver"}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-2 border-t border-white/10 pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Informes</p>
                {courseSubmissions.length === 0 ? (
                  <p className="text-sm text-slate-400">Nadie ha enviado un informe a este curso.</p>
                ) : (
                  courseSubmissions.map((item) => {
                    const draft = reviewDrafts[item.id] ?? {
                      feedback: item.feedback,
                      grade: item.grade === null ? "" : String(item.grade),
                    };
                    const gradeInvalid = !parseCourseGrade(draft.grade).ok;
                    const isOpen = openReviewId === item.id;
                    return (
                    <div key={item.id} className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm text-slate-200">
                          {item.studentDisplayName} · {item.title}
                        </span>
                        <Badge tone={item.status === "reviewed" ? "success" : "accent"}>
                          {item.status === "reviewed" ? "Corregido" : "Enviado"}
                        </Badge>
                      </div>
                      <SubmissionDelivery
                        body={item.body}
                        attachmentPath={item.attachmentPath}
                        attachmentName={item.attachmentName}
                      />
                      {item.status === "reviewed" && !isOpen ? (
                        <p className="text-sm text-slate-300">
                          {item.feedback || "Todavía sin texto de corrección."}
                          {item.grade !== null ? ` · Nota ${item.grade}/20` : ""}
                        </p>
                      ) : null}
                      {isOpen ? (
                        <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                          <label className="block text-xs font-medium text-slate-400">
                            Corrección
                            <textarea
                              className={`${areaClass} mt-1`}
                              value={draft.feedback}
                              onChange={(event) =>
                                setReviewDrafts((current) => ({
                                  ...current,
                                  [item.id]: { ...draft, feedback: event.target.value },
                                }))
                              }
                              placeholder="Qué estuvo bien y qué puede mejorar"
                            />
                          </label>
                          <label className="block text-xs font-medium text-slate-400">
                            Nota (0–20, opcional)
                            <input
                              className={`${inputClass} mt-1`}
                              inputMode="decimal"
                              value={draft.grade}
                              onChange={(event) =>
                                setReviewDrafts((current) => ({
                                  ...current,
                                  [item.id]: { ...draft, grade: event.target.value },
                                }))
                              }
                              placeholder="Ej. 18"
                            />
                          </label>
                          {gradeInvalid ? <p className="text-xs text-rose-300">La nota debe estar entre 0 y 20.</p> : null}
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void saveReview(item)}
                              disabled={savingReviewId === item.id || gradeInvalid}
                            >
                              {savingReviewId === item.id ? "Guardando…" : "Guardar corrección"}
                            </Button>
                            <Button type="button" size="sm" variant="secondary" onClick={() => setOpenReviewId(null)}>
                              Cerrar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button type="button" size="sm" variant="secondary" onClick={() => openReview(item)}>
                          {item.status === "reviewed" ? "Editar corrección" : "Corregir"}
                        </Button>
                      )}
                    </div>
                    );
                  })
                )}
              </div>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
