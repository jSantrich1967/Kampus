"use client";

import Link from "next/link";
import { CheckCircle2, ClipboardList, Loader2, Microscope, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { CollaborateSubnav } from "@/components/collaborate/collaborate-subnav";
import { ResearchOnboardingPanel } from "@/components/collaborate/research-onboarding-panel";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { presentationDueBadgeLabel } from "@/lib/calendar/presentation-due-label";
import { cn } from "@/lib/cn";
import { formatAgendaCloudError } from "@/lib/notebooks/storage-errors";
import { isStudentWorkCompleted, type StudentWork } from "@/lib/schemas/student-work";
import { addStudentWork, loadStudentWorks, removeStudentWork, setStudentWorkCompleted } from "@/lib/storage/student-work-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  deleteStudentWorkRemote,
  fetchStudentWorksRemote,
  insertStudentWorkRemote,
  updateStudentWorkCompletedRemote,
} from "@/lib/supabase/agenda-db";
import { notifyStudentWorksChanged } from "@/hooks/use-pending-student-works-count";
import { collaborateCopy } from "@/lib/i18n/collaborate";

/** Días hasta la fecha límite (medianoche local); negativo = vencido. */
function daysUntilDue(dueIso: string, now = new Date()): number | null {
  const d = dueIso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const [y, m, day] = d.split("-").map(Number);
  const due = new Date(y!, m! - 1, day!);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function formatDueLongEs(iso: string): string {
  const [y, m, day] = iso.split("-").map(Number);
  const d = new Date(y!, m! - 1, day!);
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function workUrgencyClass(diff: number | null, completed: boolean): string {
  if (completed) return "border-l-teal-500/55";
  if (diff === null) return "border-l-slate-600";
  if (diff < 0) return "border-l-rose-400/90";
  if (diff === 0) return "border-l-amber-400/90";
  if (diff <= 7) return "border-l-indigo-400/80";
  return "border-l-emerald-500/50";
}

type WorkFilterScope = "all" | "active" | "completed" | "week" | "overdue";

/**
 * Mis investigaciones: mismos datos que en Mi calendario (trabajos / entregas), enfoque en lista y fechas.
 */
export function ResearchWorksHub() {
  const searchParams = useSearchParams();
  const focusWorkId = searchParams.get("work")?.trim() ?? "";
  const { profile, hydrated, authUserId, locale } = useKampus();
  const es = locale === "es";
  const t = collaborateCopy.es;
  const useCloud = Boolean(isSupabaseConfigured() && authUserId);

  const [works, setWorks] = useState<StudentWork[]>([]);
  const [workTitle, setWorkTitle] = useState("");
  const [workSubject, setWorkSubject] = useState("");
  const [workDue, setWorkDue] = useState("");
  const [workNotes, setWorkNotes] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const [filterScope, setFilterScope] = useState<WorkFilterScope>("active");
  const [filterSubject, setFilterSubject] = useState("");
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const sortedWorks = useMemo(() => {
    return [...works].sort((a, b) => {
      const byDue = a.dueDate.localeCompare(b.dueDate);
      if (byDue !== 0) return byDue;
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });
  }, [works]);

  const stats = useMemo(() => {
    let overdue = 0;
    let thisWeek = 0;
    let completed = 0;
    for (const w of works) {
      if (isStudentWorkCompleted(w)) {
        completed += 1;
        continue;
      }
      const diff = daysUntilDue(w.dueDate);
      if (diff === null) continue;
      if (diff < 0) overdue += 1;
      else if (diff <= 7) thisWeek += 1;
    }
    return { total: works.length, overdue, thisWeek, completed, pending: works.length - completed };
  }, [works]);

  const subjectOptions = useMemo(() => {
    const fromWorks = [...new Set(works.map((w) => w.subject).filter(Boolean))];
    const merged = new Set<string>([...profile.subjects, ...fromWorks]);
    return [...merged].sort((a, b) => a.localeCompare(b, "es"));
  }, [works, profile.subjects]);

  const filteredWorks = useMemo(() => {
    return sortedWorks.filter((w) => {
      if (filterSubject.trim() && w.subject !== filterSubject) return false;
      const done = isStudentWorkCompleted(w);
      if (filterScope === "active" && done) return false;
      if (filterScope === "completed" && !done) return false;
      if (filterScope === "overdue") {
        const d = daysUntilDue(w.dueDate);
        if (d === null || d >= 0 || done) return false;
      }
      if (filterScope === "week") {
        const d = daysUntilDue(w.dueDate);
        if (d === null || d < 0 || d > 7 || done) return false;
      }
      return true;
    });
  }, [sortedWorks, filterScope, filterSubject]);

  useEffect(() => {
    if (!focusWorkId) return;
    setFilterScope("all");
    setFilterSubject("");
  }, [focusWorkId]);

  useEffect(() => {
    if (!focusWorkId || loading || works.length === 0) return;
    const row = document.getElementById(`work-row-${focusWorkId}`);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusWorkId, loading, works]);

  const loadWorks = useCallback(async () => {
    if (!hydrated) return;
    setLoading(true);
    setLoadError(null);
    try {
      if (useCloud) {
        const supabase = createSupabaseBrowserClient();
        const workList = await fetchStudentWorksRemote(supabase, authUserId!);
        setWorks(workList);
      } else {
        setWorks(loadStudentWorks());
      }
    } catch (e) {
      setLoadError(formatAgendaCloudError(e instanceof Error ? e.message : "No se pudo cargar."));
    } finally {
      setLoading(false);
    }
  }, [hydrated, useCloud, authUserId]);

  useEffect(() => {
    void loadWorks();
  }, [loadWorks, tick]);

  useEffect(() => {
    if (!hydrated) return;
    if (!workSubject.trim() && profile.subjects[0]) setWorkSubject(profile.subjects[0]!);
  }, [hydrated, profile.subjects, workSubject]);

  async function submitWork(e: FormEvent) {
    e.preventDefault();
    if (!workTitle.trim() || !workDue) return;
    const row = {
      title: workTitle.trim(),
      subject: workSubject.trim() || profile.subjects[0] || "General",
      dueDate: workDue,
      notes: workNotes.trim(),
    };
    try {
      if (useCloud) {
        const supabase = createSupabaseBrowserClient();
        await insertStudentWorkRemote(supabase, authUserId!, row);
      } else {
        addStudentWork(row);
      }
      setWorkTitle("");
      setWorkDue("");
      setWorkNotes("");
      refresh();
      notifyStudentWorksChanged();
    } catch (err) {
      setLoadError(formatAgendaCloudError(err instanceof Error ? err.message : "Error al guardar."));
    }
  }

  async function removeWork(id: string) {
    try {
      if (useCloud) {
        const supabase = createSupabaseBrowserClient();
        await deleteStudentWorkRemote(supabase, authUserId!, id);
      } else {
        removeStudentWork(id);
      }
      refresh();
      notifyStudentWorksChanged();
    } catch (err) {
      setLoadError(formatAgendaCloudError(err instanceof Error ? err.message : "Error al eliminar."));
    }
  }

  async function toggleWorkCompleted(id: string, completed: boolean) {
    try {
      if (useCloud) {
        const supabase = createSupabaseBrowserClient();
        await updateStudentWorkCompletedRemote(supabase, authUserId!, id, completed);
      } else {
        setStudentWorkCompleted(id, completed);
      }
      refresh();
      notifyStudentWorksChanged();
    } catch (err) {
      setLoadError(formatAgendaCloudError(err instanceof Error ? err.message : "Error al actualizar el estado."));
    }
  }

  if (!hydrated) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  const workStorageHint = useCloud
    ? "Se guardan en tu cuenta (Supabase) y aparecen también en Evaluación → Mi calendario."
    : "Quedan en este dispositivo. Con sesión y Supabase, se sincronizan en la nube.";

  const subjectListId = "research-subject-suggestions";

  return (
    <div className="space-y-8">
      <CollaborateSubnav />

      <ResearchOnboardingPanel useCloud={useCloud} workCount={works.length} onDemoLoaded={refresh} />

      <PageHeader
        eyebrow={t.eyebrow}
        title={t.researchPageTitle}
        description={t.researchPageDescription}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/exams/calendar">
              <Button variant="secondary" size="sm">
                {t.calendarCta}
              </Button>
            </Link>
            <Link href="/exams/student">
              <Button variant="secondary" size="sm">
                {t.examsCta}
              </Button>
            </Link>
            <Link href="/collaborate/exposiciones">
              <Button variant="ghost" size="sm">
                {t.subnavPresentations}
              </Button>
            </Link>
            <Button type="button" variant="ghost" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
              Actualizar
            </Button>
          </div>
        }
      />

      {stats.total > 0 ? (
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-slate-200">
            <span className="font-medium text-white">{stats.pending}</span>
            <span className="text-slate-400"> pendiente{stats.pending === 1 ? "" : "s"}</span>
            <span className="text-slate-600"> · </span>
            <span className="text-slate-400">{stats.total} en total</span>
          </div>
          {stats.completed > 0 ? (
            <div className="rounded-xl border border-teal-500/25 bg-teal-950/20 px-4 py-2 text-teal-100">
              <span className="font-semibold">{stats.completed}</span> entregada{stats.completed === 1 ? "" : "s"}
            </div>
          ) : null}
          {stats.overdue > 0 ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 py-2 text-rose-100">
              <span className="font-semibold">{stats.overdue}</span> vencida{stats.overdue === 1 ? "" : "s"} — revisa fechas
            </div>
          ) : null}
          {stats.thisWeek > 0 ? (
            <div className="rounded-xl border border-indigo-500/25 bg-indigo-950/20 px-4 py-2 text-indigo-100">
              <span className="font-semibold">{stats.thisWeek}</span> en los próximos 7 días
            </div>
          ) : null}
        </div>
      ) : null}

      {loadError ? <p className="text-sm text-rose-300">{loadError}</p> : null}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Sincronizando…
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
        <Card className="p-0">
          <CardHeader className="border-b border-white/5 px-5 pb-4 pt-5">
            <CardTitle>Registrar entrega</CardTitle>
            <CardDescription>{workStorageHint}</CardDescription>
          </CardHeader>
          <form className="space-y-3 px-5 pb-5 pt-4" onSubmit={(e) => void submitWork(e)}>
            <label className="block space-y-1 text-xs">
              <span className="text-slate-500">Título</span>
              <input
                required
                className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm outline-none ring-indigo-400/30 focus:ring"
                value={workTitle}
                onChange={(e) => setWorkTitle(e.target.value)}
                placeholder="Ej. Monografía unidad 3 · Investigación bibliográfica"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs">
                <span className="text-slate-500">Materia</span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm outline-none ring-indigo-400/30 focus:ring"
                  value={workSubject}
                  onChange={(e) => setWorkSubject(e.target.value)}
                  placeholder="Ej. Historia"
                  list={profile.subjects.length ? subjectListId : undefined}
                  autoComplete="off"
                />
                {profile.subjects.length ? (
                  <datalist id={subjectListId}>
                    {profile.subjects.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                ) : null}
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-slate-500">Fecha límite</span>
                <input
                  required
                  type="date"
                  className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm text-slate-200 outline-none ring-indigo-400/30 focus:ring"
                  value={workDue}
                  onChange={(e) => setWorkDue(e.target.value)}
                />
              </label>
            </div>
            <label className="block space-y-1 text-xs">
              <span className="text-slate-500">Notas (opcional)</span>
              <textarea
                rows={3}
                className="w-full resize-y rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm outline-none ring-indigo-400/30 focus:ring"
                value={workNotes}
                onChange={(e) => setWorkNotes(e.target.value)}
                placeholder="Enlace al enunciado, hipótesis, bibliografía clave, recordatorios…"
              />
            </label>
            <Button type="submit" size="sm">
              Añadir a la lista
            </Button>
          </form>
        </Card>

        <Card className="p-0">
          <CardHeader className="border-b border-white/5 px-5 pb-4 pt-5">
            <CardTitle className="flex items-center gap-2">
              <Microscope className="h-4 w-4 text-indigo-300/90" aria-hidden />
              Próximas entregas
            </CardTitle>
            <CardDescription>
              Ordenadas por fecha (la más cercana primero). Marca como entregada para archivarla: dejará de aparecer en el calendario como pendiente.
              Los colores indican urgencia; las entregadas se muestran en verde azulado.
            </CardDescription>
          </CardHeader>
          {sortedWorks.length > 0 ? (
            <div className="flex flex-col gap-3 border-b border-white/5 px-5 py-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: "active" as const, label: "Pendientes" },
                    { id: "all" as const, label: "Todas" },
                    { id: "week" as const, label: "Esta semana" },
                    { id: "overdue" as const, label: "Vencidas" },
                    { id: "completed" as const, label: "Entregadas" },
                  ] satisfies { id: WorkFilterScope; label: string }[]
                ).map(({ id, label }) => (
                  <Button
                    key={id}
                    type="button"
                    size="sm"
                    variant={filterScope === id ? "secondary" : "ghost"}
                    className="h-8"
                    aria-pressed={filterScope === id}
                    onClick={() => setFilterScope(id)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <label className="flex min-w-[10rem] flex-col gap-1 text-xs text-slate-500 sm:max-w-xs">
                <span>Materia</span>
                <select
                  className="rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm text-slate-200 outline-none ring-indigo-400/30 focus:ring"
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                >
                  <option value="">Todas las materias</option>
                  {subjectOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
          <ul className="space-y-2 px-5 py-4">
            {sortedWorks.length === 0 ? (
              <li className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/15 bg-slate-950/30 px-6 py-10 text-center">
                <ClipboardList className="h-10 w-10 text-slate-600" aria-hidden />
                <div className="max-w-sm space-y-1">
                  <p className="text-sm font-medium text-slate-200">Aún no hay trabajos registrados</p>
                  <p className="text-xs text-slate-500">
                    Usa el formulario de la izquierda para añadir tu primera entrega. Aparecerá aquí y en{" "}
                    <Link href="/exams/calendar" className="text-indigo-300 underline-offset-2 hover:underline">
                      Mi calendario
                    </Link>
                    .
                  </p>
                </div>
              </li>
            ) : filteredWorks.length === 0 ? (
              <li className="rounded-xl border border-dashed border-white/15 bg-slate-950/30 px-4 py-8 text-center text-sm text-slate-500">
                Nada coincide con los filtros. Prueba otra vista o materia.
              </li>
            ) : (
              filteredWorks.map((w) => {
                const diff = daysUntilDue(w.dueDate);
                const done = isStudentWorkCompleted(w);
                const relative = done ? (es ? "Entregado" : "Done") : presentationDueBadgeLabel(w.dueDate, es);
                return (
                  <li
                    key={w.id}
                    id={`work-row-${w.id}`}
                    className={cn(
                      "flex items-start justify-between gap-3 border border-white/10 border-l-4 bg-slate-950/30 pl-3 pr-2 py-2.5 text-sm",
                      "rounded-lg",
                      workUrgencyClass(diff, done),
                      done && "opacity-90",
                      focusWorkId === w.id && "ring-2 ring-indigo-400/45",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className={cn("font-medium text-slate-100", done && "line-through decoration-slate-500/80")}>{w.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                        <span className="text-slate-400">{formatDueLongEs(w.dueDate)}</span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-medium",
                            done && "bg-teal-500/15 text-teal-100",
                            !done && diff !== null && diff < 0 && "bg-rose-500/15 text-rose-200",
                            !done && diff === 0 && "bg-amber-500/15 text-amber-100",
                            !done && diff !== null && diff > 0 && diff <= 7 && "bg-indigo-500/15 text-indigo-100",
                            !done && (diff === null || diff > 7) && "bg-slate-800/80 text-slate-400",
                          )}
                        >
                          {relative}
                        </span>
                        <span>· {w.subject}</span>
                      </div>
                      {w.notes ? (
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-400">{w.notes}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-start">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className={cn(
                          "text-slate-300 hover:text-white",
                          done ? "text-teal-200 hover:text-teal-100" : "text-emerald-200/90 hover:text-emerald-100",
                        )}
                        aria-label={done ? "Marcar como pendiente" : "Marcar como entregado"}
                        title={done ? "Volver a pendiente" : "Marcar entregado"}
                        onClick={() => void toggleWorkCompleted(w.id, !done)}
                      >
                        {done ? <RotateCcw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-rose-300 hover:text-rose-200"
                        aria-label="Eliminar trabajo"
                        onClick={() => void removeWork(w.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
