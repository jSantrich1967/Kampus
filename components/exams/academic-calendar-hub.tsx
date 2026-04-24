"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildAgendaEvents, monthMatrix, type AgendaEvent } from "@/lib/calendar/agenda-events";
import { cn } from "@/lib/cn";
import { formatAgendaCloudError } from "@/lib/notebooks/storage-errors";
import type { Exam } from "@/lib/schemas/exams";
import type { StudentWork } from "@/lib/schemas/student-work";
import { seedDemoExamsIfEmpty, loadExams } from "@/lib/storage/exams-storage";
import { loadPresentation } from "@/lib/storage/presentation-storage";
import { addStudentWork, loadStudentWorks, removeStudentWork } from "@/lib/storage/student-work-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  deleteStudentWorkRemote,
  ensureDemoExamsRemote,
  fetchPresentationAgendaRemote,
  fetchStudentWorksRemote,
  fetchUserExams,
  insertStudentWorkRemote,
} from "@/lib/supabase/agenda-db";

const WEEKDAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function kindLabel(kind: AgendaEvent["kind"]): string {
  if (kind === "exam") return "Examen";
  if (kind === "presentation") return "Exposición";
  return "Trabajo / investigación";
}

function kindTone(kind: AgendaEvent["kind"]): "success" | "accent" | "neutral" {
  if (kind === "exam") return "success";
  if (kind === "presentation") return "accent";
  return "neutral";
}

function eventsOnDay(events: AgendaEvent[], year: number, monthIndex0: number, day: number): AgendaEvent[] {
  const m = String(monthIndex0 + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  const iso = `${year}-${m}-${d}`;
  return events.filter((e) => e.date === iso);
}

export function AcademicCalendarHub() {
  const { profile, hydrated, authUserId } = useKampus();
  const useCloud = Boolean(isSupabaseConfigured() && authUserId);

  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const firstCalendarLoad = useRef(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [exams, setExams] = useState<Exam[]>([]);
  const [works, setWorks] = useState<StudentWork[]>([]);
  const [presTitle, setPresTitle] = useState("");
  const [presDue, setPresDue] = useState<string | undefined>(undefined);

  const [workTitle, setWorkTitle] = useState("");
  const [workSubject, setWorkSubject] = useState("");
  const [workDue, setWorkDue] = useState("");
  const [workNotes, setWorkNotes] = useState("");

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const loadAgenda = useCallback(async () => {
    if (!hydrated) return;
    const showSpinner = firstCalendarLoad.current;
    if (showSpinner) setLoading(true);
    setLoadError(null);
    try {
      if (useCloud) {
        const supabase = createSupabaseBrowserClient();
        await ensureDemoExamsRemote(supabase, authUserId!, profile.subjects[0]);
        const [examList, workList, remoteAgenda] = await Promise.all([
          fetchUserExams(supabase, authUserId!),
          fetchStudentWorksRemote(supabase, authUserId!),
          fetchPresentationAgendaRemote(supabase, authUserId!),
        ]);
        setExams(examList);
        setWorks(workList);
        const local = loadPresentation();
        if (remoteAgenda) {
          setPresTitle(remoteAgenda.deckTitle.trim() ? remoteAgenda.deckTitle : local.deckTitle);
          setPresDue(remoteAgenda.presentationDueDate ?? local.presentationDueDate);
        } else {
          setPresTitle(local.deckTitle);
          setPresDue(local.presentationDueDate);
        }
      } else {
        seedDemoExamsIfEmpty(profile.subjects[0]);
        setExams(loadExams());
        setWorks(loadStudentWorks());
        const loc = loadPresentation();
        setPresTitle(loc.deckTitle);
        setPresDue(loc.presentationDueDate);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo cargar el calendario.";
      setLoadError(formatAgendaCloudError(msg));
    } finally {
      if (showSpinner) {
        setLoading(false);
        firstCalendarLoad.current = false;
      }
    }
  }, [hydrated, useCloud, authUserId, profile.subjects]);

  useEffect(() => {
    void loadAgenda();
  }, [loadAgenda, tick]);

  const events = useMemo(
    () =>
      buildAgendaEvents({
        exams,
        presentationTitle: presTitle,
        presentationDueDate: presDue,
        works,
      }),
    [exams, presTitle, presDue, works],
  );

  const y = cursor.getFullYear();
  const m0 = cursor.getMonth();
  const matrix = useMemo(() => monthMatrix(y, m0), [y, m0]);

  const monthTitle = cursor.toLocaleString("es-ES", { month: "long", year: "numeric" });

  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return events.filter((e) => e.date >= today).slice(0, 12);
  }, [events]);

  const unscheduledExams = useMemo(
    () => exams.filter((e) => e.status !== "draft" && !e.dueDate),
    [exams],
  );

  function prevMonth() {
    setCursor(new Date(y, m0 - 1, 1));
  }

  function nextMonth() {
    setCursor(new Date(y, m0 + 1, 1));
  }

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
    } catch (err) {
      setLoadError(formatAgendaCloudError(err instanceof Error ? err.message : "Error al eliminar."));
    }
  }

  useEffect(() => {
    if (!hydrated) return;
    if (!workSubject.trim() && profile.subjects[0]) setWorkSubject(profile.subjects[0]!);
  }, [hydrated, profile.subjects, workSubject]);

  if (!hydrated) return <div className="text-sm text-slate-400">Cargando…</div>;

  const workStorageHint = useCloud
    ? "Se guardan en tu cuenta (Supabase) y se muestran en el calendario en cualquier dispositivo donde inicies sesión."
    : "Quedan guardados en este dispositivo (local). Con sesión y Supabase configurado, pasan a la nube automáticamente.";

  const pageDescription = useCloud
    ? "Exámenes, fecha de exposición y trabajos se sincronizan con Supabase cuando inicias sesión."
    : "Un mismo calendario para Mis exámenes (con fecha de entrega), Mis exposiciones (fecha en el planificador) y Mis trabajos e investigaciones. Sin sesión, los datos de exámenes y trabajos quedan en el navegador.";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Evaluación"
        title="Mi calendario académico"
        description={pageDescription}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/exams/student">
              <Button variant="secondary" size="sm">
                Mis exámenes
              </Button>
            </Link>
            <Link href="/collaborate/presentations">
              <Button variant="secondary" size="sm">
                Mis exposiciones
              </Button>
            </Link>
            <Button type="button" variant="ghost" size="sm" onClick={refresh} disabled={loading}>
              Actualizar
            </Button>
          </div>
        }
      />

      {loadError ? <p className="text-sm text-rose-300">{loadError}</p> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Sincronizando calendario…
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={prevMonth} aria-label="Mes anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[10rem] capitalize text-lg font-semibold text-white">{monthTitle}</h2>
          <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={nextMonth} aria-label="Mes siguiente">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400/80" /> Examen
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-indigo-400/80" /> Exposición
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-400/80" /> Trabajo
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40">
        <div className="grid grid-cols-7 gap-px border-b border-white/10 bg-white/10 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {WEEKDAYS_ES.map((d) => (
            <div key={d} className="bg-slate-950/90 px-1 py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-white/10">
          {matrix.flat().map((day, idx) => {
            if (day === null) {
              return <div key={`e-${idx}`} className="min-h-[5.5rem] bg-slate-950/50" />;
            }
            const dayEvents = eventsOnDay(events, y, m0, day);
            const iso = `${y}-${String(m0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = iso === new Date().toISOString().slice(0, 10);
            return (
              <div
                key={iso}
                className={cn(
                  "min-h-[5.5rem] bg-slate-950/80 p-1.5 text-left",
                  isToday && "ring-1 ring-inset ring-indigo-400/40",
                )}
              >
                <div className={cn("text-xs font-semibold", isToday ? "text-indigo-200" : "text-slate-400")}>{day}</div>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <Link
                      key={ev.id}
                      href={ev.href}
                      className={cn(
                        "block truncate rounded px-1 py-0.5 text-[10px] leading-tight ring-1 transition hover:bg-white/5",
                        ev.kind === "exam" && "bg-emerald-500/15 text-emerald-100 ring-emerald-400/20",
                        ev.kind === "presentation" && "bg-indigo-500/15 text-indigo-100 ring-indigo-400/25",
                        ev.kind === "work" && "bg-white/5 text-slate-200 ring-white/10",
                      )}
                      title={`${kindLabel(ev.kind)}: ${ev.title}`}
                    >
                      {ev.title}
                    </Link>
                  ))}
                  {dayEvents.length > 3 ? (
                    <div className="text-[10px] text-slate-500">+{dayEvents.length - 3} más</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximas fechas</CardTitle>
            <CardDescription>Exámenes, exposición con fecha y trabajos — ordenados por día.</CardDescription>
          </CardHeader>
          <ul className="space-y-2 px-6 pb-6">
            {upcoming.length === 0 ? (
              <li className="text-sm text-slate-500">No hay fechas futuras. Añade entregas de trabajos o fecha en exposiciones.</li>
            ) : (
              upcoming.map((ev) => (
                <li key={ev.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-white">{ev.title}</div>
                    <div className="text-xs text-slate-500">
                      {ev.date} · {ev.subject}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={kindTone(ev.kind)}>{kindLabel(ev.kind)}</Badge>
                    <Link href={ev.href} className="text-xs text-indigo-200 hover:underline">
                      Abrir
                    </Link>
                  </div>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mis trabajos e investigaciones</CardTitle>
            <CardDescription>{workStorageHint}</CardDescription>
          </CardHeader>
          <form className="space-y-3 px-6 pb-4" onSubmit={(e) => void submitWork(e)}>
            <label className="block space-y-1 text-xs">
              <span className="text-slate-500">Título</span>
              <input
                required
                className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm outline-none ring-indigo-400/30 focus:ring"
                value={workTitle}
                onChange={(e) => setWorkTitle(e.target.value)}
                placeholder="Ej. Ensayo final unidad 3"
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
                />
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
              <input
                className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm outline-none ring-indigo-400/30 focus:ring"
                value={workNotes}
                onChange={(e) => setWorkNotes(e.target.value)}
                placeholder="Enlace al enunciado, página del libro…"
              />
            </label>
            <Button type="submit" size="sm">
              Añadir al calendario
            </Button>
          </form>
          <ul className="space-y-2 border-t border-white/10 px-6 py-4">
            {works.length === 0 ? (
              <li className="text-sm text-slate-500">Aún no hay trabajos registrados.</li>
            ) : (
              works.map((w) => (
                <li key={w.id} className="flex items-start justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-100">{w.title}</div>
                    <div className="text-xs text-slate-500">
                      {w.dueDate} · {w.subject}
                    </div>
                    {w.notes ? <div className="mt-1 text-xs text-slate-400">{w.notes}</div> : null}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="shrink-0 text-rose-300 hover:text-rose-200"
                    aria-label="Eliminar trabajo"
                    onClick={() => void removeWork(w.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      {unscheduledExams.length > 0 ? (
        <Card className="border-amber-400/20 bg-amber-500/[0.06]">
          <CardHeader>
            <CardTitle className="text-amber-100">Exámenes sin fecha en calendario</CardTitle>
            <CardDescription>
              Estos exámenes no tienen «vence el…» todavía; no aparecen en la cuadrícula hasta que tengan fecha (p. ej. al
              publicarlos desde docencia en una versión futura).
            </CardDescription>
          </CardHeader>
          <ul className="list-disc space-y-1 px-6 pb-6 pl-10 text-sm text-amber-50/90">
            {unscheduledExams.map((e) => (
              <li key={e.id}>
                <Link href={`/exams/student/${e.id}`} className="underline-offset-2 hover:underline">
                  {e.title}
                </Link>
                <span className="text-amber-200/70"> · {e.subject}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
