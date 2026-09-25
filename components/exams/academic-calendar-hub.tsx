"use client";

import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CalendarTodayFocusPanel } from "@/components/exams/calendar-today-focus-panel";
import { VirtualClassIcsExportButton } from "@/components/collaborate/virtual-class-ics-export-button";
import { CalendarAgendaEventChip } from "@/components/exams/calendar-agenda-event-chip";
import { CalendarCompactAgenda } from "@/components/exams/calendar-compact-agenda";
import { CalendarWeekGrid } from "@/components/exams/calendar-week-grid";
import { ExamPracticePanel } from "@/components/exams/exam-practice-panel";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { RescuePackDisplay } from "@/components/rescue/rescue-pack-display";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildAgendaEvents,
  LOCAL_ONLY_PRESENTATION_ID,
  monthMatrix,
  type AgendaEvent,
  type PresentationAgendaSlice,
} from "@/lib/calendar/agenda-events";
import { localIsoDate } from "@/lib/calendar/local-iso-date";
import { daysUntilDate, daysLeftLabel, urgencyTone } from "@/lib/calendar/calendar-urgency";
import { buildClassAgendaEventsForRange } from "@/lib/calendar/class-agenda-events";
import { buildVirtualClassAgendaEvents } from "@/lib/calendar/virtual-class-agenda-events";
import type { VirtualClassAgendaSlice } from "@/lib/calendar/virtual-class-agenda-events";
import {
  addDays,
  buildWeekDayCells,
  formatWeekRangeLabel,
  getMondayOfWeek,
} from "@/lib/calendar/calendar-week";
import { AGENDA_DRAG_MIME, parseAgendaEventRef } from "@/lib/calendar/agenda-drag";
import { syncCancellationsWithCloud } from "@/lib/calendar/sync-cancellations";
import { cn } from "@/lib/cn";
import { formatAgendaCloudError } from "@/lib/notebooks/storage-errors";
import type { Exam } from "@/lib/schemas/exams";
import { isStudentWorkCompleted, type StudentWork } from "@/lib/schemas/student-work";
import type { ClassCancellation, ClassScheduleRow } from "@/lib/schemas/class-schedule";
import { subjectToPathSegment } from "@/lib/notebooks/paths";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import { combineNotebookExtractedTextForPack } from "@/lib/notebooks/document-tags";
import { postRescuePack } from "@/lib/rescue/post-rescue-pack";
import type { RescuePack } from "@/lib/class-rescue";
import { seedDemoExamsIfEmpty, loadExams, updateExamDueDate } from "@/lib/storage/exams-storage";
import { loadPresentation, savePresentation } from "@/lib/storage/presentation-storage";
import { addStudentWork, loadStudentWorks, removeStudentWork, setStudentWorkCompleted, updateStudentWorkDueDate } from "@/lib/storage/student-work-storage";
import { addClassScheduleRow, loadClassSchedule, removeClassScheduleRow, saveClassSchedule } from "@/lib/storage/class-schedule-storage";
import {
  loadClassCancellations,
  removeClassCancellation,
  upsertClassCancellation,
} from "@/lib/storage/class-cancellation-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  deleteStudentWorkRemote,
  ensureDemoExamsRemote,
  fetchPresentationDeckSummariesRemote,
  fetchClassScheduleRemote,
  fetchStudentWorksRemote,
  fetchUserExams,
  insertClassScheduleRemote,
  insertStudentWorkRemote,
  updateStudentWorkCompletedRemote,
  updateExamDueDateRemote,
  updateStudentWorkDueDateRemote,
  updatePresentationDueDateRemote,
  deleteClassScheduleRemote,
  upsertClassCancellationRemote,
  deleteClassCancellationRemote,
} from "@/lib/supabase/agenda-db";
import { notifyStudentWorksChanged } from "@/hooks/use-pending-student-works-count";
import { notifyPresentationsChanged } from "@/lib/collaborate/presentation-urgency";
import { fetchVirtualClassSessionsInRangeForExport } from "@/lib/supabase/virtual-class-db";
import type { VirtualClassSessionExport } from "@/lib/supabase/virtual-class-db";
import { notifyClassScheduleChanged } from "@/hooks/use-class-schedule";
import { examsCopy } from "@/lib/i18n/exams";
import { calendarCopy } from "@/lib/i18n/calendar";
import { buildVirtualClassFromScheduleHref } from "@/lib/collaborate/virtual-class-schedule-link";
import { collaborateCopy } from "@/lib/i18n/collaborate";
import { buildCommunityExamHref } from "@/lib/community/channels";
import { buildPassModeSubjectHref } from "@/lib/today/block-action-href";

const WEEKDAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type CalendarViewMode = "month" | "week" | "compact";

function kindLabel(kind: AgendaEvent["kind"], cal: (typeof calendarCopy)["es"]): string {
  if (kind === "exam") return "Examen";
  if (kind === "presentation") return "Exposición";
  if (kind === "class") return "Clase";
  if (kind === "virtualClass") return cal.virtualClassLabel;
  return "Trabajo / investigación";
}

function kindTone(kind: AgendaEvent["kind"]): "success" | "accent" | "neutral" {
  if (kind === "exam") return "success";
  if (kind === "presentation") return "accent";
  if (kind === "virtualClass") return "success";
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
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
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
  const [presentationSlices, setPresentationSlices] = useState<PresentationAgendaSlice[]>([]);
  const [virtualSessions, setVirtualSessions] = useState<VirtualClassAgendaSlice[]>([]);
  const [virtualSessionExports, setVirtualSessionExports] = useState<VirtualClassSessionExport[]>([]);

  const cal = calendarCopy.es;
  const collab = collaborateCopy.es;
  const labelForKind = useCallback((kind: AgendaEvent["kind"]) => kindLabel(kind, cal), [cal]);

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
  const [kitDeleteBusy, setKitDeleteBusy] = useState(false);
  const [kitSources, setKitSources] = useState<
    | {
        title: string;
        mode: "single" | "selection";
        scheduleId?: string;
        classDate?: string;
        docs: Array<{
          id: string;
          filename: string;
          topic?: string | null;
          lesson_point?: string | null;
          practice_exercises?: string | null;
          extractedLen: number;
          extractedPreview: string;
          storagePath: string;
        }>;
      }
    | null
  >(null);
  const [selectedClassKeys, setSelectedClassKeys] = useState<string[]>([]);
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [dropTargetIso, setDropTargetIso] = useState<string | null>(null);
  const [rescheduleBusy, setRescheduleBusy] = useState(false);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  function toggleSelectedClassKey(key: string) {
    setSelectedClassKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function materialHint(mat: { topic?: string | null; lesson_point?: string | null } | null): string {
    if (!mat) return "";
    const point = (mat.lesson_point ?? "").trim();
    // Some older uploads (from calendar deep link) stored date/time into lesson_point.
    // Ignore those so we only show real "Punto" values.
    const looksLikeDateTime = /^\d{4}-\d{2}-\d{2}\b/.test(point);
    if (point && !looksLikeDateTime) return `Punto: ${point}`;
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

  function mostCommonSubjectFromDocs(docs: NotebookDocumentRow[]): string {
    const counts = new Map<string, number>();
    docs.forEach((d) => {
      const s = String(d.subject ?? "").trim();
      if (!s) return;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    });
    let best = "";
    let bestCount = 0;
    counts.forEach((count, subject) => {
      if (count > bestCount) {
        best = subject;
        bestCount = count;
      }
    });
    return best;
  }

  /**
   * Notes sent to the pack generator so the output stays anchored to the selected class,
   * even when extracted_text is empty (e.g. image scans without OCR).
   */
  function buildKitNotesFromDocs(docs: NotebookDocumentRow[], contextTitle: string): string {
    const topics = new Set<string>();
    const points = new Set<string>();
    const exercises = new Set<string>();
    docs.forEach((d) => {
      const t = String(d.topic ?? "").trim();
      const p = String(d.lesson_point ?? "").trim();
      const e = String(d.practice_exercises ?? "").trim();
      if (t) topics.add(t);
      if (p) points.add(p);
      if (e) exercises.add(e);
    });

    const lines: string[] = [];
    lines.push(`Contexto: ${contextTitle}`);
    if (topics.size) lines.push(`Tema(s): ${Array.from(topics).slice(0, 12).join(" | ")}`);
    if (points.size) lines.push(`Punto(s): ${Array.from(points).slice(0, 12).join(" | ")}`);
    if (exercises.size) lines.push(`Ejercicios: ${Array.from(exercises).slice(0, 12).join(" | ")}`);
    lines.push("");
    lines.push("Archivos usados en esta clase (con etiquetas):");
    docs.slice(0, 40).forEach((d) => {
      const parts: string[] = [d.filename];
      const t = String(d.topic ?? "").trim();
      const p = String(d.lesson_point ?? "").trim();
      const e = String(d.practice_exercises ?? "").trim();
      if (t) parts.push(`Tema=${t}`);
      if (p) parts.push(`Punto=${p}`);
      if (e) parts.push(`Ejercicios=${e}`);
      lines.push(`- ${parts.join(" · ")}`);
    });
    lines.push("");
    lines.push(
      "Instrucción: genera el kit SOLO con base en este contexto y el texto extraído del archivo si existe. No inventes temario genérico que no aparezca aquí.",
    );
    return lines.join("\n").trim();
  }

  async function deleteNotebookDocuments(docs: Array<{ id: string; storagePath: string }>) {
    if (!useCloud || !authUserId) {
      setKitError("Para borrar apuntes de tu cuenta, inicia sesión primero.");
      return;
    }
    if (docs.length === 0) return;
    if (kitDeleteBusy) return;

    const ok = window.confirm(
      docs.length === 1
        ? "¿Borrar este apunte/archivo? Esto también eliminará el archivo de la nube."
        : `¿Borrar ${docs.length} apuntes/archivos? Esto también eliminará los archivos de la nube.`,
    );
    if (!ok) return;

    setKitDeleteBusy(true);
    setKitError(null);
    try {
      const supabase = createSupabaseBrowserClient();

      // 1) Remove storage objects (best-effort).
      const paths = docs.map((d) => d.storagePath).filter((p) => Boolean(p && p.trim()));
      if (paths.length > 0) {
        const { error: rmErr } = await supabase.storage.from("notebooks").remove(paths);
        if (rmErr) {
          // Don't fail hard: we still delete DB rows so the UI unblocks, but we warn.
          setKitError(`Aviso: no se pudieron borrar algunos archivos en Storage: ${rmErr.message}`);
        }
      }

      // 2) Delete DB rows.
      const ids = docs.map((d) => d.id);
      const { error: delErr } = await supabase.from("notebook_documents").delete().in("id", ids).eq("user_id", authUserId);
      if (delErr) throw delErr;

      // Update local panel state so user sees immediate change.
      setKitSources((prev) => {
        if (!prev) return prev;
        const nextDocs = prev.docs.filter((d) => !ids.includes(d.id));
        return { ...prev, docs: nextDocs };
      });

      // Refresh calendar counts/hints.
      refresh();

      // If kit was based on deleted docs, clear it to avoid confusion.
      setKitPack(null);
      setKitError((prev) => prev ?? "Apuntes borrados. Vuelve a generar el kit si lo necesitas.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudieron borrar los apuntes.";
      setKitError(formatAgendaCloudError(msg));
    } finally {
      setKitDeleteBusy(false);
    }
  }

  async function generateKitForClass(scheduleId: string, classDate: string, subject: string) {
    if (!useCloud || !authUserId) {
      setKitError("Para generar el kit desde material del cuaderno, inicia sesión (usa Supabase).");
      return;
    }
    setKitBusy(true);
    setKitError(null);
    setKitPack(null);
    setKitSources(null);
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
      const contextTitle = `${subject} · ${classDate}`;
      const notes = buildKitNotesFromDocs(docs, contextTitle);
      setKitSources({
        title: contextTitle,
        mode: "single",
        scheduleId,
        classDate,
        docs: docs.map((d) => {
          const t = (d.extracted_text ?? "").trim();
          return {
            id: String(d.id),
            filename: d.filename,
            topic: d.topic ?? null,
            lesson_point: d.lesson_point ?? null,
            practice_exercises: d.practice_exercises ?? null,
            extractedLen: t.length,
            extractedPreview: t.slice(0, 240),
            storagePath: d.storage_path,
          };
        }),
      });
      const { pack, packError } = await postRescuePack(
        {
          subjectHint: subject,
          sourceLabel: `Clase ${classDate} (${docs.length} archivo${docs.length === 1 ? "" : "s"})`,
          sourceKind: "notes",
          extractedFileText,
          notes,
          link: "",
          uploadedFileCount: docs.length,
          seedText: "",
          packMode: profile.plan === "premium" ? ("full" as const) : ("lite" as const),
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

  async function generateKitForSelectedClasses() {
    if (!useCloud || !authUserId) {
      setKitError("Para generar el kit desde material del cuaderno, inicia sesión (usa Supabase).");
      return;
    }
    const keys = selectedClassKeys.slice();
    if (keys.length === 0) {
      setKitError("Primero selecciona al menos una clase en el calendario (clic para marcar en amarillo).");
      return;
    }
    setKitBusy(true);
    setKitError(null);
    setKitPack(null);
    setKitSources(null);
    setKitTitle(`Selección · ${keys.length} clase${keys.length === 1 ? "" : "s"}`);
    try {
      const supabase = createSupabaseBrowserClient();
      const parts = keys
        .map((k) => {
          const [scheduleId, classDate] = k.split(":");
          return { scheduleId: scheduleId ?? "", classDate: classDate ?? "" };
        })
        .filter((x) => x.scheduleId && x.classDate);

      const results = await Promise.all(
        parts.map(async ({ scheduleId, classDate }) => {
          const { data, error } = await supabase
            .from("notebook_documents")
            .select("*")
            .eq("user_id", authUserId)
            .eq("schedule_id", scheduleId)
            .eq("class_date", classDate)
            .order("created_at", { ascending: false })
            .limit(60);
          if (error) throw error;
          return (data as NotebookDocumentRow[]) ?? [];
        }),
      );

      const docs = results.flat();
      if (docs.length === 0) {
        setKitError("No hay material subido en las clases seleccionadas todavía. Sube apuntes y vuelve a intentar.");
        return;
      }

      const extractedFileText = combineNotebookExtractedTextForPack(docs);
      const subjectFromDocs = mostCommonSubjectFromDocs(docs) || profile.subjects[0] || "Selección";
      const notes = buildKitNotesFromDocs(docs, `Selección · ${keys.length} clase${keys.length === 1 ? "" : "s"}`);
      setKitSources({
        title: `Selección · ${keys.length} clase${keys.length === 1 ? "" : "s"}`,
        mode: "selection",
        docs: docs.map((d) => {
          const t = (d.extracted_text ?? "").trim();
          return {
            id: String(d.id),
            filename: d.filename,
            topic: d.topic ?? null,
            lesson_point: d.lesson_point ?? null,
            practice_exercises: d.practice_exercises ?? null,
            extractedLen: t.length,
            extractedPreview: t.slice(0, 240),
            storagePath: d.storage_path,
          };
        }),
      });
      const { pack, packError } = await postRescuePack(
        {
          subjectHint: subjectFromDocs,
          sourceLabel: `Selección de clases (${keys.length}) · ${docs.length} archivo${docs.length === 1 ? "" : "s"}`,
          sourceKind: "notes",
          extractedFileText,
          notes,
          link: "",
          uploadedFileCount: docs.length,
          seedText: "",
          packMode: profile.plan === "premium" ? ("full" as const) : ("lite" as const),
        },
        { seedText: extractedFileText, subjectHint: subjectFromDocs, sourceLabel: "Cuaderno", sourceKind: "notes" },
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
        const [examList, workList, classList, deckSummaries] = await Promise.all([
          fetchUserExams(supabase, authUserId!),
          fetchStudentWorksRemote(supabase, authUserId!),
          fetchClassScheduleRemote(supabase, authUserId!),
          fetchPresentationDeckSummariesRemote(supabase, authUserId!),
        ]);
        const mergedCancellations = await syncCancellationsWithCloud(
          supabase,
          authUserId!,
          loadClassCancellations(authUserId),
        );
        setExams(examList);
        setWorks(workList);
        setClasses(classList);
        saveClassSchedule(classList, authUserId);
        setCancellations(mergedCancellations);
        setPresentationSlices(
          deckSummaries.map((s) => ({
            id: s.id,
            title: s.deckTitle,
            dueDate: s.presentationDueDate,
          })),
        );
      } else {
        seedDemoExamsIfEmpty(profile.subjects[0]);
        setExams(loadExams());
        setWorks(loadStudentWorks());
        setClasses(loadClassSchedule());
        setCancellations(loadClassCancellations());
        const loc = loadPresentation(authUserId);
        const due = loc.presentationDueDate?.trim();
        setPresentationSlices(
          due
            ? [
                {
                  id: LOCAL_ONLY_PRESENTATION_ID,
                  title: loc.deckTitle.trim() || "Exposición",
                  dueDate: due,
                },
              ]
            : [],
        );
      }
      notifyClassScheduleChanged();
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
        presentations: presentationSlices,
        works,
      }),
    [exams, presentationSlices, works],
  );

  /** Misma prioridad que en Mis investigaciones: fecha límite ascendente, luego más reciente por creación. */
  const sortedWorksForCalendarList = useMemo(() => {
    return [...works].sort((a, b) => {
      const byDue = a.dueDate.localeCompare(b.dueDate);
      if (byDue !== 0) return byDue;
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });
  }, [works]);

  const visibleRange = useMemo(() => {
    if (viewMode === "week") {
      return { start: weekStart, end: addDays(weekStart, 6) };
    }
    const year = cursor.getFullYear();
    const m0 = cursor.getMonth();
    return { start: new Date(year, m0, 1), end: new Date(year, m0 + 1, 0) };
  }, [viewMode, cursor, weekStart]);

  const classEvents = useMemo(
    () => buildClassAgendaEventsForRange(classes, cancellations, visibleRange.start, visibleRange.end),
    [classes, cancellations, visibleRange],
  );

  const virtualClassEvents = useMemo(
    () => buildVirtualClassAgendaEvents(virtualSessions),
    [virtualSessions],
  );

  useEffect(() => {
    if (!useCloud || !authUserId) {
      setVirtualSessions([]);
      setVirtualSessionExports([]);
      return;
    }
    let cancelled = false;
    const from = new Date(visibleRange.start);
    from.setHours(0, 0, 0, 0);
    const to = new Date(visibleRange.end);
    to.setHours(23, 59, 59, 999);
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const rows = await fetchVirtualClassSessionsInRangeForExport(supabase, from, to);
        if (!cancelled) {
          setVirtualSessionExports(rows);
          setVirtualSessions(
            rows.map((s) => ({
              id: s.id,
              course: s.course,
              topic: s.topic,
              startsAt: s.startsAt,
            })),
          );
        }
      } catch {
        if (!cancelled) {
          setVirtualSessions([]);
          setVirtualSessionExports([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [useCloud, authUserId, visibleRange, tick]);

  const allEvents = useMemo(() => {
    return [...events, ...classEvents, ...virtualClassEvents].sort(
      (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title),
    );
  }, [events, classEvents, virtualClassEvents]);

  const y = cursor.getFullYear();
  const m0 = cursor.getMonth();
  const matrix = useMemo(() => monthMatrix(y, m0), [y, m0]);

  const monthTitle = cursor.toLocaleString("es-ES", { month: "long", year: "numeric" });
  const weekTitle = formatWeekRangeLabel(weekStart);
  const weekDays = useMemo(
    () => buildWeekDayCells(weekStart, localIsoDate(), WEEKDAYS_ES),
    [weekStart],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!useCloud || !authUserId) {
      setClassDocsByKey({});
      return;
    }
    const firstIso = `${visibleRange.start.getFullYear()}-${String(visibleRange.start.getMonth() + 1).padStart(2, "0")}-${String(visibleRange.start.getDate()).padStart(2, "0")}`;
    const lastIso = `${visibleRange.end.getFullYear()}-${String(visibleRange.end.getMonth() + 1).padStart(2, "0")}-${String(visibleRange.end.getDate()).padStart(2, "0")}`;

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
  }, [hydrated, useCloud, authUserId, visibleRange]);

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

  function prevWeek() {
    setWeekStart((w) => addDays(w, -7));
  }

  function nextWeek() {
    setWeekStart((w) => addDays(w, 7));
  }

  function goToTodayView() {
    const today = new Date();
    setWeekStart(getMondayOfWeek(today));
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  const rescheduleEvent = useCallback(
    async (eventId: string, newDateIso: string) => {
      const ref = parseAgendaEventRef(eventId);
      if (!ref || !/^\d{4}-\d{2}-\d{2}$/.test(newDateIso)) return;
      setRescheduleBusy(true);
      setLoadError(null);
      try {
        if (ref.kind === "exam") {
          if (useCloud) {
            const supabase = createSupabaseBrowserClient();
            await updateExamDueDateRemote(supabase, authUserId!, ref.entityId, newDateIso);
          }
          updateExamDueDate(ref.entityId, newDateIso);
        } else if (ref.kind === "work") {
          if (useCloud) {
            const supabase = createSupabaseBrowserClient();
            await updateStudentWorkDueDateRemote(supabase, authUserId!, ref.entityId, newDateIso);
          }
          updateStudentWorkDueDate(ref.entityId, newDateIso);
          notifyStudentWorksChanged();
        } else if (ref.kind === "presentation") {
          if (ref.entityId === LOCAL_ONLY_PRESENTATION_ID) {
            const loc = loadPresentation(authUserId);
            savePresentation({ ...loc, presentationDueDate: newDateIso }, authUserId);
          } else if (useCloud) {
            const supabase = createSupabaseBrowserClient();
            await updatePresentationDueDateRemote(supabase, authUserId!, ref.entityId, newDateIso);
          }
          notifyPresentationsChanged();
        }
        refresh();
      } catch (err) {
        setLoadError(formatAgendaCloudError(err instanceof Error ? err.message : calendarCopy.es.rescheduleError));
      } finally {
        setRescheduleBusy(false);
        setDraggingEventId(null);
        setDropTargetIso(null);
      }
    },
    [useCloud, authUserId, refresh],
  );

  const handleDayDrop = useCallback(
    (iso: string, eventId: string) => {
      void rescheduleEvent(eventId, iso);
    },
    [rescheduleEvent],
  );

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
      setLoadError(formatAgendaCloudError(err instanceof Error ? err.message : "Error al actualizar el trabajo."));
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
      upsertClassCancellation({
        scheduleId: cancelScheduleId,
        classDate: cancelDate,
        reason: cancelReason.trim(),
      });
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
      removeClassCancellation(id);
      refresh();
    } catch (err) {
      setLoadError(formatAgendaCloudError(err instanceof Error ? err.message : "Error al eliminar suspensión."));
    }
  }

  if (!hydrated) return <div className="text-sm text-slate-400">Cargando…</div>;

  const workStorageHint = useCloud
    ? "Se guardan en tu cuenta y aparecen en el calendario de cualquier dispositivo donde inicies sesión."
    : "Se guardan en este dispositivo. Si inicias sesión, también los verás en tus otros dispositivos.";

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
            <Link href="/exams" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Mis exámenes
            </Link>
            <Link
              href="/collaborate/exposiciones"
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              Crear / planificar exposición
            </Link>
            <Link
              href="/collaborate/investigaciones"
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              Mis investigaciones
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

      <CalendarTodayFocusPanel />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-white/10 p-0.5">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "month" ? "secondary" : "ghost"}
              onClick={() => setViewMode("month")}
            >
              {calendarCopy.es.viewMonth}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "week" ? "secondary" : "ghost"}
              onClick={() => {
                setViewMode("week");
                setWeekStart(getMondayOfWeek(new Date()));
              }}
            >
              {calendarCopy.es.viewWeek}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "compact" ? "secondary" : "ghost"}
              onClick={() => setViewMode("compact")}
            >
              {calendarCopy.es.viewCompact}
            </Button>
          </div>
          {viewMode === "month" ? (
            <>
              <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={prevMonth} aria-label="Mes anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="min-w-[10rem] capitalize text-lg font-semibold text-white">{monthTitle}</h2>
              <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={nextMonth} aria-label="Mes siguiente">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          ) : viewMode === "week" ? (
            <>
              <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={prevWeek} aria-label="Semana anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="min-w-[12rem] text-lg font-semibold text-white">{weekTitle}</h2>
              <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={nextWeek} aria-label="Semana siguiente">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <h2 className="min-w-[12rem] text-lg font-semibold text-white">{calendarCopy.es.viewCompact}</h2>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={goToTodayView}>
            {calendarCopy.es.goToday}
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
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-teal-400/80" /> {cal.virtualClassLabel}
            </span>
          </div>
          {useCloud && virtualSessionExports.length > 0 ? (
            <VirtualClassIcsExportButton sessions={virtualSessionExports} />
          ) : null}
          <p className="max-w-sm text-right text-[11px] leading-snug text-slate-600">
            {calendarCopy.es.dragHint}
          </p>
          <p className="max-w-sm text-right text-[11px] leading-snug text-slate-600">
            {calendarCopy.es.classClickHint}
          </p>
          {rescheduleBusy ? (
            <p className="text-[11px] text-indigo-300">{calendarCopy.es.dropHint}</p>
          ) : null}
        </div>
      </div>

      {viewMode === "compact" ? (
        <CalendarCompactAgenda
          events={allEvents}
          kindLabel={labelForKind}
          draggingEventId={draggingEventId}
          onDragStart={setDraggingEventId}
          onDragEnd={() => setDraggingEventId(null)}
        />
      ) : viewMode === "week" ? (
        <CalendarWeekGrid
          days={weekDays}
          eventsOnDay={(iso) => allEvents.filter((e) => e.date === iso)}
          classDocsByKey={classDocsByKey}
          selectedClassKeys={selectedClassKeys}
          onToggleClassKey={toggleSelectedClassKey}
          materialHint={materialHint}
          kindLabel={labelForKind}
          dropTargetIso={dropTargetIso}
          draggingEventId={draggingEventId}
          onDragStart={setDraggingEventId}
          onDragEnd={() => setDraggingEventId(null)}
          onDayDragOver={setDropTargetIso}
          onDayDragLeave={() => setDropTargetIso(null)}
          onDayDrop={handleDayDrop}
        />
      ) : (
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
                  "min-h-[5.5rem] bg-slate-950/80 p-1.5 text-left transition",
                  isToday && "ring-1 ring-inset ring-indigo-400/40",
                  dropTargetIso === iso && "bg-indigo-500/10 ring-2 ring-inset ring-indigo-400/50",
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropTargetIso(iso);
                }}
                onDragLeave={() => setDropTargetIso(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const eventId = e.dataTransfer.getData(AGENDA_DRAG_MIME);
                  if (eventId) void handleDayDrop(iso, eventId);
                  setDropTargetIso(null);
                }}
              >
                <div className={cn("text-xs font-semibold", isToday ? "text-indigo-200" : "text-slate-400")}>{day}</div>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev) => {
                    const isClass = ev.kind === "class" && ev.id.startsWith("class:");
                    const key = isClass ? `${ev.id.split(":")[1]}:${ev.date}` : "";
                    const selected = Boolean(key) && selectedClassKeys.includes(key);
                    const mat = key ? classDocsByKey[key] : null;
                    const hint = materialHint(mat);
                    return (
                      <CalendarAgendaEventChip
                        key={ev.id}
                        ev={ev}
                        hint={hint}
                        kindLabel={labelForKind(ev.kind)}
                        selected={selected}
                        dragging={draggingEventId === ev.id}
                        onDragStart={setDraggingEventId}
                        onDragEnd={() => setDraggingEventId(null)}
                        className="text-[10px]"
                        onClassClick={(e) => {
                          if (e.metaKey || e.ctrlKey) return;
                          e.preventDefault();
                          toggleSelectedClassKey(key);
                        }}
                      />
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
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
        <div className="text-sm text-slate-300">
          <span className="text-slate-500">Selección:</span>{" "}
          <span className="font-semibold text-slate-100">
            {selectedClassKeys.length} clase{selectedClassKeys.length === 1 ? "" : "s"}
          </span>
          <span className="ml-2 text-xs text-slate-500">(clic para marcar en amarillo · Ctrl/Cmd clic para abrir)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedClassKeys([])} disabled={selectedClassKeys.length === 0}>
            Limpiar
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/30 hover:bg-amber-500/25"
            disabled={kitBusy || selectedClassKeys.length === 0}
            onClick={() => void generateKitForSelectedClasses()}
          >
            {kitBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Crear kit con selección
          </Button>
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
              upcoming.map((ev) => {
                const daysLeft = daysUntilDate(ev.date);
                const isClass = ev.kind === "class" && ev.id.startsWith("class:");
                const scheduleId = isClass ? (ev.id.split(":")[1] ?? "") : "";
                const classKey = scheduleId ? `${scheduleId}:${ev.date}` : "";
                const classMat = classKey ? classDocsByKey[classKey] : null;
                const classNoteCount = classMat?.count ?? 0;

                return (
                <li key={ev.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-white">{ev.title}</span>
                      {daysLeft !== null && daysLeft >= 0 ? (
                        <Badge tone={urgencyTone(daysLeft)}>{daysLeftLabel(daysLeft)}</Badge>
                      ) : null}
                    </div>
                    <div className="text-xs text-slate-500">
                      {ev.date} · {ev.subject}
                      {isClass ? (
                        (() => {
                          const hint = classKey ? materialHint(classDocsByKey[classKey] ?? null) : "";
                          return hint ? <span className="text-slate-400"> · {hint}</span> : null;
                        })()
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Badge tone={kindTone(ev.kind)}>{labelForKind(ev.kind)}</Badge>
                    {isClass ? (
                      <Badge tone={classNoteCount > 0 ? "success" : "warning"}>
                        {classNoteCount > 0 ? calendarCopy.es.classNotesReady : calendarCopy.es.classNotesMissing}
                      </Badge>
                    ) : null}
                    {ev.kind === "exam" && ev.passModeHref ? (
                      <Link href={ev.passModeHref}>
                        <Button type="button" size="sm" variant="secondary">
                          {examsCopy.es.calendarPassModeCta}
                        </Button>
                      </Link>
                    ) : null}
                    {ev.kind === "exam" && profile.interestedInCommunity !== false ? (
                      <Link href={buildCommunityExamHref(ev.subject, ev.date)}>
                        <Button type="button" size="sm" variant="ghost">
                          {calendarCopy.es.communityExamCta}
                        </Button>
                      </Link>
                    ) : null}
                    {ev.kind === "exam" ? <ExamPracticePanel subject={ev.subject} compact /> : null}
                    {ev.kind === "presentation" ? (
                      <>
                        <Link href={ev.href}>
                          <Button type="button" size="sm" variant="secondary">
                            {calendarCopy.es.calendarPresentationCta}
                          </Button>
                        </Link>
                        <Link href="/collaborate/sala-estudio">
                          <Button type="button" size="sm" variant="ghost">
                            {calendarCopy.es.calendarStudyRoomCta}
                          </Button>
                        </Link>
                      </>
                    ) : null}
                    {isClass && scheduleId ? (
                      <Link href={buildVirtualClassFromScheduleHref(scheduleId, ev.date)}>
                        <Button type="button" size="sm" variant="ghost">
                          {cal.calendarVirtualClassCta}
                        </Button>
                      </Link>
                    ) : null}
                    {isClass ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
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
                );
              })
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
              Marca una clase específica (una fecha) como suspendida. Esa fecha aparecerá en el calendario marcada como suspendida, con su justificación.
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
              <Button type="submit" size="sm" variant="secondary">
                {calendarCopy.es.saveCancellation}
              </Button>
            </form>
            {cancellations.length > 0 ? (
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
              sortedWorksForCalendarList.map((w) => {
                const done = isStudentWorkCompleted(w);
                return (
                  <li
                    key={w.id}
                    className={cn(
                      "flex items-start justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-sm",
                      done && "border-teal-500/20 opacity-90",
                    )}
                  >
                    <div className="min-w-0">
                      <div className={cn("font-medium text-slate-100", done && "line-through decoration-slate-500/70")}>{w.title}</div>
                      <div className="text-xs text-slate-500">
                        {w.dueDate} · {w.subject}
                        {done ? <span className="ml-2 text-teal-300/90">· Entregado</span> : null}
                      </div>
                      {w.notes ? <div className="mt-1 text-xs text-slate-400">{w.notes}</div> : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className={done ? "text-teal-200 hover:text-teal-100" : "text-emerald-200/90 hover:text-emerald-100"}
                        aria-label={done ? "Marcar como pendiente" : "Marcar como entregado"}
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
            {kitSources?.mode === "single" && kitSources.docs.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="border border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                  disabled={!useCloud || kitDeleteBusy}
                  onClick={() => void deleteNotebookDocuments(kitSources.docs.map((d) => ({ id: d.id, storagePath: d.storagePath })))}
                >
                  {kitDeleteBusy ? "Borrando…" : "Borrar apuntes de esta clase"}
                </Button>
                {!useCloud ? (
                  <span className="text-[11px] text-slate-500">Para borrar en la nube, inicia sesión (Supabase).</span>
                ) : null}
              </div>
            ) : null}
            {kitSources ? (
              <details className="rounded-xl border border-white/10 bg-slate-950/40 p-3 text-xs text-slate-300">
                <summary className="cursor-pointer select-none text-slate-200">
                  {calendarCopy.es.diagnosticsSummary}
                </summary>
                <div className="mt-2 space-y-2">
                  <p className="text-slate-400">
                    Si <strong className="text-slate-200">extracted</strong> está en 0–50 caracteres, el kit puede salir genérico porque no
                    hubo OCR/texto real.
                  </p>
                  <ul className="space-y-2">
                    {kitSources.docs.slice(0, 40).map((d) => (
                      <li key={d.id} className="rounded-lg border border-white/10 bg-slate-950/30 p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-slate-100">{d.filename}</div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 shrink-0 text-rose-300 hover:text-rose-200"
                            disabled={!useCloud || kitDeleteBusy}
                            onClick={() => void deleteNotebookDocuments([{ id: d.id, storagePath: d.storagePath }])}
                            aria-label="Borrar apunte"
                            title={!useCloud ? "Inicia sesión para borrar en la nube" : "Borrar apunte"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          extracted: {d.extractedLen} chars
                          {d.topic ? ` · Tema: ${d.topic}` : ""}
                          {d.lesson_point ? ` · Punto: ${d.lesson_point}` : ""}
                          {d.practice_exercises ? ` · Ejercicios: ${d.practice_exercises}` : ""}
                        </div>
                        {d.extractedPreview ? (
                          <div className="mt-1 whitespace-pre-wrap rounded-md border border-white/10 bg-black/20 p-2 text-[11px] text-slate-300">
                            {d.extractedPreview}
                            {d.extractedLen > d.extractedPreview.length ? "…" : ""}
                          </div>
                        ) : (
                          <div className="mt-1 text-[11px] text-slate-500">(Sin texto extraído)</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            ) : null}
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
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <Link href={`/exams/student/${e.id}`} className="underline-offset-2 hover:underline">
                    {e.title}
                  </Link>
                  <span className="text-amber-200/70"> · {e.subject}</span>
                </span>
                <Link href={buildPassModeSubjectHref(e.subject)}>
                  <Button size="sm" variant="secondary">
                    {examsCopy.es.calendarPassModeCta}
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
