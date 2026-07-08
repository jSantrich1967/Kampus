"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, Presentation } from "lucide-react";
import { useEffect, useState } from "react";

import { VirtualClassBreakoutPanel } from "@/components/collaborate/virtual-class-breakout-panel";
import { VirtualClassLmsPanel } from "@/components/collaborate/virtual-class-lms-panel";
import { VirtualClassParticipationPanel } from "@/components/collaborate/virtual-class-participation-panel";
import { VirtualClassRecordingPanel } from "@/components/collaborate/virtual-class-recording-panel";
import { VirtualClassTranscriptPanel } from "@/components/collaborate/virtual-class-transcript-panel";
import { VirtualClassVideoPanel } from "@/components/collaborate/virtual-class-video-panel";
import { useVirtualClassAttendance } from "@/hooks/use-virtual-class-attendance";
import { VirtualClassroomRosterPanel } from "@/components/collaborate/virtual-classroom-roster-panel";
import { buildCalendarHrefForScheduleLink } from "@/lib/collaborate/virtual-class-schedule-link";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildSessionPresentationHref } from "@/lib/collaborate/virtual-session-path";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { enrollVirtualClassSession } from "@/lib/supabase/virtual-class-db";
import { collaborateCopy } from "@/lib/i18n/collaborate";

type Props = { sessionId: string };

type SessionRow = {
  id: string;
  created_by: string;
  course: string;
  professor_name: string;
  topic: string;
  capacity: number;
  starts_at: string;
  room_label: string;
  join_url: string | null;
  embed_video_url: string | null;
  presentation_url: string | null;
  recording_url: string | null;
  transcript_text: string | null;
  transcript_updated_at: string | null;
  lms_course_id: string | null;
  schedule_row_id: string | null;
  class_date: string | null;
  virtual_class_roster?: { count: number }[] | null;
};

type UiSession = {
  id: string;
  createdBy: string;
  course: string;
  professor: string;
  topic: string;
  capacity: number;
  enrolled: number;
  startsAt: string;
  roomLabel: string;
  joinUrl: string | null;
  embedVideoUrl: string | null;
  presentationUrl: string | null;
  recordingUrl: string | null;
  transcriptText: string | null;
  transcriptUpdatedAt: string | null;
  lmsCourseId: string | null;
  scheduleRowId: string | null;
  classDate: string | null;
};

function formatTime(total: number) {
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function VirtualClassroomSession({ sessionId }: Props) {
  const { locale, authUserId } = useKampus();
  const es = locale === "es";
  const t = collaborateCopy.es;
  const [session, setSession] = useState<UiSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [focusSeconds, setFocusSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!authUserId || !isSupabaseConfigured()) {
      setSession(null);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("virtual_class_sessions")
          .select(
            "id,created_by,course,professor_name,topic,capacity,starts_at,room_label,join_url,embed_video_url,presentation_url,recording_url,transcript_text,transcript_updated_at,lms_course_id,schedule_row_id,class_date,virtual_class_roster(count)",
          )
          .eq("id", sessionId)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        if (!data) {
          setSession(null);
          return;
        }
        const row = data as SessionRow;
        let enrolled = row.virtual_class_roster?.[0]?.count ?? 0;
        try {
          const enrollResult = await enrollVirtualClassSession(supabase, sessionId);
          if (enrollResult.ok && !enrollResult.alreadyEnrolled) enrolled += 1;
        } catch {
          /* enrollment optional — roster may be closed or full */
        }
        setSession({
          id: row.id,
          createdBy: row.created_by,
          course: row.course,
          professor: row.professor_name,
          topic: row.topic,
          capacity: row.capacity,
          enrolled,
          startsAt: row.starts_at,
          roomLabel: row.room_label,
          joinUrl: row.join_url ?? null,
          embedVideoUrl: row.embed_video_url ?? null,
          presentationUrl: row.presentation_url ?? null,
          recordingUrl: row.recording_url ?? null,
          transcriptText: row.transcript_text ?? null,
          transcriptUpdatedAt: row.transcript_updated_at ?? null,
          lmsCourseId: row.lms_course_id ?? null,
          scheduleRowId: row.schedule_row_id ?? null,
          classDate: row.class_date ?? null,
        });
      } catch (e) {
        const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : null;
        setLoadError(msg || (es ? "No se pudo cargar la sesión." : "Could not load session."));
        setSession(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId, es, sessionId]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setFocusSeconds((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useVirtualClassAttendance(sessionId, Boolean(authUserId && session));

  if (!isSupabaseConfigured()) {
    return <p className="text-sm text-amber-200/90">{es ? "Falta configurar Supabase." : "Supabase is not configured."}</p>;
  }

  if (!authUserId) {
    return <p className="text-sm text-slate-400">{es ? "Inicia sesión para ver la sesión." : "Sign in to view this session."}</p>;
  }

  if (loadError) {
    return <p className="text-sm text-rose-200/90">{loadError}</p>;
  }

  if (loading) {
    return <p className="text-sm text-slate-400">{es ? "Cargando sesión…" : "Loading session…"}</p>;
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-400">{es ? "No encontramos esa sesión." : "Session not found."}</p>
        <Link href="/collaborate/aula-virtual" className={buttonClasses({ variant: "secondary", size: "sm" })}>
          {es ? "Volver al listado" : "Back to list"}
        </Link>
      </div>
    );
  }

  const seatsLeft = Math.max(0, session.capacity - session.enrolled);
  const presHref = buildSessionPresentationHref(session.id, session.presentationUrl);
  const isCreator = authUserId === session.createdBy;
  const sessionStarted = new Date(session.startsAt).getTime() <= Date.now();

  async function refreshEnrolledCount() {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("virtual_class_sessions")
        .select("virtual_class_roster(count)")
        .eq("id", sessionId)
        .maybeSingle();
      if (error) throw error;
      const count = (data as SessionRow | null)?.virtual_class_roster?.[0]?.count ?? 0;
      setSession((prev) => (prev ? { ...prev, enrolled: count } : prev));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/collaborate/aula-virtual"
          className={buttonClasses({ variant: "ghost", size: "sm", className: "gap-2" })}
        >
          <ArrowLeft className="h-4 w-4" />
          {es ? "Aula virtual" : "Virtual classroom"}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-white md:text-3xl">{session.course}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {session.professor} · {session.roomLabel}
        </p>
        <p className="mt-2 text-sm text-slate-200">
          <span className="text-slate-500">{es ? "Tema:" : "Topic:"}</span> {session.topic}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {es ? "Cupo:" : "Seats:"}{" "}
          {seatsLeft} {es ? "libres de" : "free of"} {session.capacity} ({session.enrolled} {es ? "dentro" : "inside"})
        </p>
        {session.scheduleRowId && session.classDate ? (
          <Link
            href={buildCalendarHrefForScheduleLink(session.scheduleRowId, session.classDate)}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-teal-300 hover:underline"
          >
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            {t.scheduleLinkedBadge(session.classDate)}
          </Link>
        ) : null}
      </div>

      <VirtualClassParticipationPanel sessionId={session.id} isCreator={isCreator} sessionLoaded />

      <VirtualClassLmsPanel
        sessionId={session.id}
        isCreator={isCreator}
        creatorUserId={session.createdBy}
        lmsCourseId={session.lmsCourseId}
        onUpdated={(id) => setSession((prev) => (prev ? { ...prev, lmsCourseId: id } : prev))}
      />

      <VirtualClassRecordingPanel
        sessionId={session.id}
        isCreator={isCreator}
        recordingUrl={session.recordingUrl}
        sessionStarted={sessionStarted}
        onUpdated={(url) => setSession((prev) => (prev ? { ...prev, recordingUrl: url } : prev))}
      />

      <VirtualClassTranscriptPanel
        sessionId={session.id}
        isCreator={isCreator}
        transcriptText={session.transcriptText}
        transcriptUpdatedAt={session.transcriptUpdatedAt}
        onUpdated={(text) =>
          setSession((prev) =>
            prev ? { ...prev, transcriptText: text, transcriptUpdatedAt: new Date().toISOString() } : prev,
          )
        }
      />

      <VirtualClassBreakoutPanel sessionId={session.id} isCreator={isCreator} courseTitle={session.course} />

      {isCreator ? (
        <VirtualClassroomRosterPanel
          sessionId={session.id}
          capacity={session.capacity}
          enrolled={session.enrolled}
          onRosterChange={() => void refreshEnrolledCount()}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <VirtualClassVideoPanel embedVideoUrl={session.embedVideoUrl} joinUrl={session.joinUrl} />

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Presentation className="h-5 w-5 text-indigo-200" />
              {es ? "Presentación" : "Presentation"}
            </CardTitle>
            <CardDescription>
              {es ? "Abre el planificador de exposición o tus diapositivas." : "Open the group presentation planner."}
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Link href={presHref} className={buttonClasses()}>
              {es ? "Ir a presentación / material" : "Go to presentation"}
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{es ? "Temporizador (opcional)" : "Timer (optional)"}</CardTitle>
          <CardDescription>{es ? "Para mantener foco durante la clase." : "To stay focused during class."}</CardDescription>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-3 px-6 pb-6">
          <div className="text-3xl font-semibold text-white">{formatTime(focusSeconds)}</div>
          <Button type="button" variant={running ? "danger" : "primary"} onClick={() => setRunning((r) => !r)}>
            {running ? (es ? "Pausar" : "Pause") : es ? "Iniciar" : "Start"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setFocusSeconds(0)}>
            {es ? "Reiniciar" : "Reset"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
