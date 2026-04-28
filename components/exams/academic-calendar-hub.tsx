"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { RescuePackDisplay } from "@/components/rescue/rescue-pack-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildAgendaEvents, monthMatrix, type AgendaEvent } from "@/lib/calendar/agenda-events";
import { localIsoDate } from "@/lib/calendar/local-iso-date";
import { cn } from "@/lib/cn";
import { formatAgendaCloudError } from "@/lib/notebooks/storage-errors";
import type { Exam } from "@/lib/schemas/exams";
import type { StudentWork } from "@/lib/schemas/student-work";
import type { ClassCancellation, ClassScheduleRow } from "@/lib/schemas/class-schedule";
import { subjectToPathSegment } from "@/lib/notebooks/paths";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import { combineNotebookExtractedTextForPack } from "@/lib/notebooks/document-tags";
import { postRescuePack } from "@/lib/rescue/post-rescue-pack";
import type { RescuePack } from "@/lib/class-rescue";
import { seedDemoExamsIfEmpty, loadExams } from "@/lib/storage/exams-storage";
import { loadPresentation } from "@/lib/storage/presentation-storage";
import { addStudentWork, loadStudentWorks, removeStudentWork } from "@/lib/storage/student-work-storage";
import { addClassScheduleRow, loadClassSchedule, removeClassScheduleRow } from "@/lib/storage/class-schedule-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  deleteStudentWorkRemote,
  ensureDemoExamsRemote,
  fetchPresentationAgendaRemote,
  fetchClassScheduleRemote,
  fetchClassCancellationsRemote,
  fetchStudentWorksRemote,
  fetchUserExams,
  insertClassScheduleRemote,
  insertStudentWorkRemote,
  deleteClassScheduleRemote,
  upsertClassCancellationRemote,
  deleteClassCancellationRemote,
} from "@/lib/supabase/agenda-db";

const WEEKDAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function kindLabel(kind: AgendaEvent["kind"]): string {
  if (kind === "exam") return "Examen";
  if (kind === "presentation") return "Exposición";
  if (kind === "class") return "Clase";
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
  const [classes, setClasses] = useState<ClassScheduleRow[]>([]);
  const [cancellations, setCancellations] = useState<ClassCancellation[]>([]);
  const [classDocsByKey, setClassDocsByKey] = useState<
    Record<string, { count: number; filenames: string[]; topic?: string | null; lesson_point?: string | null }>
  >({});
  const [presTitle, setPresTitle] = useState("");
  const [presDue, setPresDue] = useState<string | undefined>(undefined);

  const [workTitle, setWorkTitle] = useState("");
  const [workSubject, setWorkSubject] = useState("");
  const [workDue, setWorkDue] = useState("");
  const [workNotes, setWorkNotes] = useState("");

  const [classWeekday, setClassWeekday] = useState("0");
  const [classStart, setClassStart] = useState("08:00");
  const [classEnd, setClassEnd] = useState("10:00");
  const [classSubject, setClassSubject] = useState("");
  const [classLocation, setClassLocation] = useState("");
  const [classProfessor, setClassProfessor] = useState("");

  const [cancelScheduleId, setCancelScheduleId] = useState("");
  const [cancelDate, setCancelDate] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const [kitBusy, setKitBusy] = useState(false);
  const [kitError, setKitError] = useState<string | null>(null);
  const [kitPack, setKitPack] = useState<RescuePack | null>(null);
  const [kitTitle, setKitTitle] = useState<string>("");

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  function materialHint(mat: { topic?: string | null; lesson_point?: string | null } | null): string {
    if (!mat) return "";
    const point = (mat.lesson_point ?? "").trim();
    if (point) return `Punto: ${point}`;
    const topic = (mat.topic ?? "").trim();
    if (topic) return `Tema: ${topic}`;
    return "";
  }

  function isoFromDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  /** Monday=0..Sunday=6, returns next occurrence date (today included). */
  function nextIsoForWeekday(weekdayMon0: number): string {
    const now = new Date();
    const todayMon0 = (now.getDay() + 6) % 7;
    const delta = (weekdayMon0 - todayMon0 + 7) % 7;
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + delta);
    return isoFromDate(d);
  }

  async function generateKitForClass(scheduleId: string, classDate: string, subject: string) {
    if (!useCloud || !authUserId) {
      setKitError("Para generar el kit desde material del cuaderno, inicia sesión (usa Supabase).");
      return;
    }
    setKitBusy(true);
    setKitError(null);
    setKitPack(null);
    setKitTitle(`${subject} · ${classDate}`);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("notebook_documents")
        .select("*")
        .eq("user_id", authUserId)
        .eq("schedule_id", scheduleId)
        .eq("class_date", classDate)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      const docs = (data as NotebookDocumentRow[]) ?? [];
      if (docs.length === 0) {
        setKitError("No hay material subido para esa clase/fecha todavía. Usa “Subir apuntes” primero.");
        return;
      }
      const extractedFileText = combineNotebookExtractedTextForPack(docs);
      const { pack, packError } = await postRescuePack(
        {
          subjectHint: subject,
          sourceLabel: `Clase ${classDate} (${docs.length} archivo${docs.length === 1 ? "" : "s"})`,
          sourceKind: "notes",
          extractedFileText,
          notes: "",
          link: "",
          uploadedFileCount: docs.length,
          seedText: "",
        },
        { seedText: extractedFileText, subjectHint: subject, sourceLabel: "Cuaderno", sourceKind: "notes" },
      );
      setKitPack(pack);
      setKitError(packError);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo generar el kit.";
      setKitError(formatAgendaCloudError(msg));
    } finally {
      setKitBusy(false);
    }
  }

  const loadAgenda = useCallback(async () => {
    if (!hydrated) return;
    const showSpinner = firstCalendarLoad.current;
    if (showSpinner) setLoading(true);
    setLoadError(null);
    try {
      if (useCloud) {
        const supabase = createSupabaseBrowserClient();
        await ensureDemoExamsRemote(supabase, authUserId!, profile.subjects[0]);
        const [examList, workList, classList, cancelList, remoteAgenda] = await Promise.all([
          fetchUserExams(supabase, authUserId!),
          fetchStudentWorksRemote(supabase, authUserId!),
          fetchClassScheduleRemote(supabase, authUserId!),
          fetchClassCancellationsRemote(supabase, authUserId!),
          fetchPresentationAgendaRemote(supabase, authUserId!),
        ]);
        setExams(examList);
        setWorks(workList);
        setClasses(classList);
        setCancellations(cancelList);
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
        setClasses(loadClassSchedule());
        setCancellations([]);
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

  const classEvents = useMemo(() => {
    if (classes.length === 0) return [] as AgendaEvent[];
    const year = cursor.getFullYear();
    const monthIndex0 = cursor.getMonth();
    const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
    const out: AgendaEvent[] = [];
    for (let d = 1; d <= lastDay; d += 1) {
      const date = new Date(year, monthIndex0, d);
      const weekdayMon0 = (date.getDay() + 6) % 7;
      const iso = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      for (const c of classes) {
        if (c.weekday !== weekdayMon0) continue;
        const cancelled = cancellations.find((x) => x.scheduleId === c.id && x.classDate === iso) ?? null;
        const uploadHref = `/study/library?subject=${encodeURIComponent(c.subject)}&topic=${encodeURIComponent(
          "Clase",
        )}&lesson=${encodeURIComponent(`${iso} ${c.startTime}–${c.endTime}`)}&scheduleId=${encodeURIComponent(
          c.id,
        )}&classDate=${encodeURIComponent(iso)}&expand=1`;
        out.push({
          id: `class:${c.id}:${iso}`,
          kind: "class",
          date: iso,
          title: cancelled ? `${c.startTime} · ${c.subject} (suspendida)` : `${c.startTime} · ${c.subject}`,
          subject: c.subject,
          href: uploadHref,
          note: cancelled?.reason?.trim() ? `Justificación: ${cancelled.reason.trim()}` : undefined,
        });
      }
    }
    return out;
  }, [classes, cancellations, cursor]);

  const allEvents = useMemo(() => {
    return [...events, ...classEvents].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  }, [events, classEvents]);

  const y = cursor.getFullYear();
  const m0 = cursor.getMonth();
  const matrix = useMemo(() => monthMatrix(y, m0), [y, m0]);

  const monthTitle = cursor.toLocaleString("es-ES", { month: "long", year: "numeric" });

  useEffect(() => {
    if (!hydrated) return;
    if (!useCloud || !authUserId) {
      setClassDocsByKey({});
      return;
    }
    const year = cursor.getFullYear();
    const monthIndex0 = cursor.getMonth();
    const firstIso = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-01`;
    const lastIso = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-${String(
      new Date(year, monthIndex0 + 1, 0).getDate(),
    ).padStart(2, "0")}`;

    let cancelled = false;
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("notebook_documents")
          .select("schedule_id,class_date,filename,user_id,topic,lesson_point")
          .eq("user_id", authUserId)
          .gte("class_date", firstIso)
          .lte("class_date", lastIso)
          .not("schedule_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(500);
        if (error) throw error;
        const rows = (data ?? []) as Pick<
          NotebookDocumentRow,
          "schedule_id" | "class_date" | "filename" | "user_id" | "topic" | "lesson_point"
        >[];
        const next: Record<string, { count: number; filenames: string[]; topic?: string | null; lesson_point?: string | null }> = {};
        for (const r of rows) {
          const sid = r.schedule_id ?? "";
          const cd = r.class_date ?? "";
          if (!sid || !cd) continue;
          const key = `${sid}:${cd}`;
          if (!next[key]) next[key] = { count: 0, filenames: [], topic: null, lesson_point: null };
          next[key]!.count += 1;
          if (next[key]!.filenames.length < 3) next[key]!.filenames.push(r.filename);
          // rows are created_at desc, so first non-empty is the latest hint
          if (!next[key]!.lesson_point && (r.lesson_point ?? "").trim()) next[key]!.lesson_point = r.lesson_point ?? null;
          if (!next[key]!.topic && (r.topic ?? "").trim()) next[key]!.topic = r.topic ?? null;
        }
        if (!cancelled) setClassDocsByKey(next);
      } catch {
        if (!cancelled) setClassDocsByKey({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, useCloud, authUserId, cursor]);

  const upcoming = useMemo(() => {
    const today = localIsoDate();
    return allEvents.filter((e) => e.date >= today).slice(0, 12);
  }, [allEvents]);

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

  async function submitClassSchedule(e: FormEvent) {
    e.preventDefault();
    const subject = classSubject.trim() || profile.subjects[0] || "";
    if (!subject.trim()) {
      setLoadError("Escribe la materia para la clase.");
      return;
    }
    const input = {
      weekday: Number(classWeekday),
      startTime: classStart,
      endTime: classEnd,
      subject,
      location: classLocation.trim(),
      professorName: classProfessor.trim(),
    };
    try {
      if (useCloud) {
        const supabase = createSupabaseBrowserClient();
        await insertClassScheduleRemote(supabase, authUserId!, input);
      } else {
        addClassScheduleRow(input);
      }
      setClassSubject("");
      setClassLocation("");
      setClassProfessor("");
      refresh();
    } catch (err) {
      setLoadError(formatAgendaCloudError(err instanceof Error ? err.message : "Error al guardar horario."));
    }
  }

  async function removeClassSchedule(id: string) {
    try {
      if (useCloud) {
        const supabase = createSupabaseBrowserClient();
        await deleteClassScheduleRemote(supabase, authUserId!, id);
      } else {
        removeClassScheduleRow(id);
      }
      refresh();
    } catch (err) {
      setLoadError(formatAgendaCloudError(err instanceof Error ? err.message : "Error al eliminar horario."));
    }
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

  useEffect(() => {
    if (!hydrated) return;
    if (!classSubject.trim() && profile.subjects[0]) setClassSubject(profile.subjects[0]!);
  }, [hydrated, profile.subjects, classSubject]);

  useEffect(() => {
    if (cancelDate.trim()) return;
    setCancelDate(localIsoDate());
  }, [cancelDate]);

  useEffect(() => {
    if (cancelScheduleId.trim()) return;
    if (classes[0]?.id) setCancelScheduleId(classes[0].id);
  }, [cancelScheduleId, classes]);

  async function submitCancellation(e: FormEvent) {
    e.preventDefault();
    if (!cancelScheduleId.trim() || !cancelDate.trim()) return;
    try {
      if (useCloud) {
        const supabase = createSupabaseBrowserClient();
        await upsertClassCancellationRemote(supabase, authUserId!, {
          scheduleId: cancelScheduleId,
          classDate: cancelDate,
          reason: cancelReason.trim(),
        });
      }
      setCancelReason("");
      refresh();
    } catch (err) {
      setLoadError(formatAgendaCloudError(err instanceof Error ? err.message : "Error al guardar suspensión."));
    }
  }

  async function removeCancellation(id: string) {
    try {
      if (useCloud) {
        const supabase = createSupabaseBrowserClient();
        await deleteClassCancellationRemote(supabase, authUserId!, id);
      }
      refresh();
    } catch (err) {
      setLoadError(formatAgendaCloudError(err instanceof Error ? err.message : "Error al eliminar suspensión."));
    }
  }

  if (!hydrated) return <div className="text-sm text-slate-400">Cargando…</div>;

  const workStorageHint = useCloud
    ? "Se guardan en tu cuenta (Supabase) y se muestran en el calendario en cualquier dispositivo donde inicies sesión."
    : "Quedan guardados en este dispositivo (local). Con sesión y Supabase configurado, pasan a la nube automáticamente.";

  const pageDescription = useCloud
    ? "Exámenes, fecha de exposición y trabajos se sincronizan con Supabase cuando inicias sesión."
    : "Un mismo calendario para Mis exámenes (con fecha de entrega), Mis exposiciones (fecha en Colaboración) y Mis investigaciones. Sin sesión, los datos de exámenes y trabajos quedan en el navegador.";

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
            <Link href="/collaborate/exposiciones">
              <Button variant="secondary" size="sm">
                Mis exposiciones
              </Button>
            </Link>
            <Link href="/collaborate/investigaciones">
              <Button variant="secondary" size="sm">
                Mis investigaciones
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
        <div className="flex flex-col items-end gap-1 text-xs text-slate-500">
          <div className="flex flex-wrap justify-end gap-2">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400/80" /> Examen
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-indigo-400/80" /> Exposición
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-slate-200/60" /> Clase
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-slate-400/80" /> Trabajo
            </span>
          </div>
          <p className="max-w-sm text-right text-[11px] leading-snug text-slate-600">
            Exposición y trabajo: fecha en el planificador o entregas en la columna derecha. Exámenes demo usan fechas en tu zona horaria (mes actual cuando cabe).
          </p>
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
            const dayEvents = eventsOnDay(allEvents, y, m0, day);
            const iso = `${y}-${String(m0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = iso === localIsoDate();
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
                  {dayEvents.slice(0, 3).map((ev) => {
                    const isClass = ev.kind === "class" && ev.id.startsWith("class:");
                    const key = isClass ? `${ev.id.split(":")[1]}:${ev.date}` : "";
                    const mat = key ? classDocsByKey[key] : null;
                    const hint = materialHint(mat);
                    const suffix = mat?.count ? ` · +${mat.count}${hint ? ` · ${hint}` : ""}` : hint ? ` · ${hint}` : "";
                    return (
                    <Link
                      key={ev.id}
                      href={ev.href}
                      className={cn(
                        "block truncate rounded px-1 py-0.5 text-[10px] leading-tight ring-1 transition hover:bg-white/5",
                        ev.kind === "exam" && "bg-emerald-500/15 text-emerald-100 ring-emerald-400/20",
                        ev.kind === "presentation" && "bg-indigo-500/15 text-indigo-100 ring-indigo-400/25",
                        ev.kind === "class" && "bg-white/5 text-slate-200 ring-white/10",
                        ev.kind === "work" && "bg-white/5 text-slate-200 ring-white/10",
                      )}
                      title={`${kindLabel(ev.kind)}: ${ev.title}${ev.note ? ` · ${ev.note}` : ""}`}
                    >
                      {ev.title}
                      {suffix}
                    </Link>
                    );
                  })}
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
                      {ev.kind === "class" && ev.id.startsWith("class:") ? (
                        (() => {
                          const scheduleId = ev.id.split(":")[1] ?? "";
                          const key = scheduleId ? `${scheduleId}:${ev.date}` : "";
                          const hint = key ? materialHint(classDocsByKey[key] ?? null) : "";
                          return hint ? <span className="text-slate-400"> · {hint}</span> : null;
                        })()
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={kindTone(ev.kind)}>{kindLabel(ev.kind)}</Badge>
                    {ev.kind === "class" && ev.id.startsWith("class:") ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const parts = ev.id.split(":");
                          const scheduleId = parts[1] ?? "";
                          if (!scheduleId) return;
                          void generateKitForClass(scheduleId, ev.date, ev.subject);
                        }}
                      >
                        Kit
                      </Button>
                    ) : null}
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
            <CardTitle>Mi horario de clases</CardTitle>
            <CardDescription>
              {useCloud
                ? "Se guarda en tu cuenta (Supabase). Cada clase aparece en el calendario y abre el cuaderno de la materia."
                : "Se guarda en este dispositivo. Con sesión y Supabase, se sincroniza en la nube."}
            </CardDescription>
          </CardHeader>
          <form className="space-y-3 px-6 pb-4" onSubmit={(e) => void submitClassSchedule(e)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs">
                <span className="text-slate-500">Día</span>
                <select
                  className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm text-slate-200 outline-none ring-indigo-400/30 focus:ring"
                  value={classWeekday}
                  onChange={(e) => setClassWeekday(e.target.value)}
                >
                  <option value="0">Lunes</option>
                  <option value="1">Martes</option>
                  <option value="2">Miércoles</option>
                  <option value="3">Jueves</option>
                  <option value="4">Viernes</option>
                  <option value="5">Sábado</option>
                  <option value="6">Domingo</option>
                </select>
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-slate-500">Materia</span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm outline-none ring-indigo-400/30 focus:ring"
                  value={classSubject}
                  onChange={(e) => setClassSubject(e.target.value)}
                  placeholder={profile.subjects[0] || "Ej. Econometría"}
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs">
                <span className="text-slate-500">Inicio</span>
                <input
                  required
                  type="time"
                  className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm text-slate-200 outline-none ring-indigo-400/30 focus:ring"
                  value={classStart}
                  onChange={(e) => setClassStart(e.target.value)}
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-slate-500">Fin</span>
                <input
                  required
                  type="time"
                  className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm text-slate-200 outline-none ring-indigo-400/30 focus:ring"
                  value={classEnd}
                  onChange={(e) => setClassEnd(e.target.value)}
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs">
                <span className="text-slate-500">Lugar (opcional)</span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm outline-none ring-indigo-400/30 focus:ring"
                  value={classLocation}
                  onChange={(e) => setClassLocation(e.target.value)}
                  placeholder="Ej. Aula 204"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-slate-500">Profesor (opcional)</span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm outline-none ring-indigo-400/30 focus:ring"
                  value={classProfessor}
                  onChange={(e) => setClassProfessor(e.target.value)}
                  placeholder="Ej. Dra. Martínez"
                />
              </label>
            </div>
            <Button type="submit" size="sm">
              Agregar clase
            </Button>
          </form>

          <div className="border-t border-white/10 px-6 py-4">
            <div className="text-sm font-semibold text-white">Clase suspendida</div>
            <p className="mt-1 text-xs text-slate-400">
              Marca una clase específica (una fecha) como suspendida. Esa fecha aparecerá en el calendario como “(suspendida)” con su justificación.
            </p>
            <form className="mt-3 space-y-3" onSubmit={(e) => void submitCancellation(e)}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs">
                  <span className="text-slate-500">Clase</span>
                  <select
                    className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm text-slate-200 outline-none ring-indigo-400/30 focus:ring"
                    value={cancelScheduleId}
                    onChange={(e) => setCancelScheduleId(e.target.value)}
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {WEEKDAYS_ES[c.weekday]} {c.startTime}–{c.endTime} · {c.subject}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-slate-500">Fecha</span>
                  <input
                    required
                    type="date"
                    className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm text-slate-200 outline-none ring-indigo-400/30 focus:ring"
                    value={cancelDate}
                    onChange={(e) => setCancelDate(e.target.value)}
                  />
                </label>
              </div>
              <label className="block space-y-1 text-xs">
                <span className="text-slate-500">Justificación (opcional)</span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm outline-none ring-indigo-400/30 focus:ring"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ej. Profesor enfermo, paro, cambio de aula…"
                />
              </label>
              <Button type="submit" size="sm" variant="secondary" disabled={!useCloud}>
                Guardar suspensión
              </Button>
              {!useCloud ? (
                <p className="text-[11px] text-slate-500">
                  Para guardar “clase suspendida” en la nube, inicia sesión (usa Supabase). En modo local lo implementamos después.
                </p>
              ) : null}
            </form>
            {useCloud && cancellations.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {cancellations.slice(0, 8).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <div className="truncate text-slate-200">
                        {c.classDate} · {c.reason?.trim() ? c.reason : "Sin justificación"}
                      </div>
                    </div>
                    <Button type="button" size="sm" variant="ghost" onClick={() => void removeCancellation(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <ul className="space-y-2 border-t border-white/10 px-6 py-4">
            {classes.length === 0 ? (
              <li className="text-sm text-slate-500">Aún no has agregado clases a tu horario.</li>
            ) : (
              classes.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-100">
                      {WEEKDAYS_ES[c.weekday]} {c.startTime}–{c.endTime} · {c.subject}
                    </div>
                    <div className="text-xs text-slate-500">
                      {[c.location, c.professorName].filter(Boolean).join(" · ") || "Sin detalles"}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs">
                      <Link href={`/study/notebook/${subjectToPathSegment(c.subject)}`} className="text-indigo-200 hover:underline">
                        Ver cuaderno
                      </Link>
                      <Link
                        href={`/study/library?subject=${encodeURIComponent(c.subject)}&topic=${encodeURIComponent(
                          "Clase",
                        )}&lesson=${encodeURIComponent(`Hoy ${c.startTime}–${c.endTime}`)}&scheduleId=${encodeURIComponent(
                          c.id,
                        )}&classDate=${encodeURIComponent(localIsoDate())}&expand=1`}
                        className="text-indigo-200 hover:underline"
                      >
                        Subir apuntes de hoy
                      </Link>
                      <button
                        type="button"
                        className="text-indigo-200 hover:underline"
                        onClick={() => void generateKitForClass(c.id, nextIsoForWeekday(c.weekday), c.subject)}
                      >
                        Kit (próxima clase)
                      </button>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="shrink-0 text-rose-300 hover:text-rose-200"
                    aria-label="Eliminar clase"
                    onClick={() => void removeClassSchedule(c.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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

      {kitBusy || kitError || kitPack ? (
        <Card className="border-indigo-400/20 bg-indigo-500/[0.06]">
          <CardHeader>
            <CardTitle>{kitTitle ? `Kit de estudio · ${kitTitle}` : "Kit de estudio"}</CardTitle>
            <CardDescription>
              {useCloud ? "Generado desde el material subido para esa clase/fecha." : "Requiere sesión para usar material del cuaderno."}
            </CardDescription>
          </CardHeader>
          <div className="space-y-3 px-6 pb-6">
            {kitBusy ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Generando kit…
              </div>
            ) : null}
            {kitError ? <p className="text-sm text-rose-300">{kitError}</p> : null}
          </div>
          {kitPack ? <RescuePackDisplay pack={kitPack} premium={profile.plan === "premium"} /> : null}
        </Card>
      ) : null}

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
