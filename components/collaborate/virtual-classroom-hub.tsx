"use client";

import Link from "next/link";
import { MessageCircle, Video } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { VirtualClassroomOnboardingPanel } from "@/components/collaborate/virtual-classroom-onboarding-panel";
import { VirtualClassroomCreateForm, type VirtualClassSchedulePrefill } from "@/components/collaborate/virtual-classroom-create-form";
import { VirtualClassWebcalPanel } from "@/components/collaborate/virtual-class-webcal-panel";
import { VirtualClassIcsExportButton } from "@/components/collaborate/virtual-class-ics-export-button";
import { CollaborateSubnav } from "@/components/collaborate/collaborate-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { collaborateCopy } from "@/lib/i18n/collaborate";
import { mailboxCopy, buildVcWhatsappMessage, vcWhatsappShareUrl } from "@/lib/i18n/mailbox";
import { navCopy } from "@/lib/i18n/nav";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { enrollVirtualClassSession, fetchMyVirtualClassSessionIds } from "@/lib/supabase/virtual-class-db";
import {
  isDemoModeClient,
  loadDemoVcSessions,
  toggleDemoVcEnrollment,
  type DemoVcSession,
} from "@/lib/storage/virtual-class-demo-storage";
import { fetchClassScheduleRemote } from "@/lib/supabase/agenda-db";
import { endsAtFromScheduleSlot, startsAtFromScheduleSlot } from "@/lib/collaborate/virtual-class-schedule-link";
import { useSupabaseSWR } from "@/lib/hooks/use-supabase-swr";

type SessionRow = {
  id: string;
  course: string;
  professor_name: string;
  topic: string;
  capacity: number;
  starts_at: string;
  room_label: string;
  join_url: string | null;
  embed_video_url: string | null;
  virtual_class_roster?: { count: number }[] | null;
};

type UiSession = {
  id: string;
  course: string;
  professor: string;
  topic: string;
  capacity: number;
  enrolled: number;
  isEnrolled: boolean;
  startsAt: string;
  roomLabel: string;
  joinUrl: string | null;
  embedVideoUrl: string | null;
  /** Sesión de demostración guardada en este dispositivo. */
  demo?: boolean;
};

function demoSessionToUi(s: DemoVcSession): UiSession {
  return {
    id: s.id,
    course: s.course,
    professor: s.professor,
    topic: s.topic,
    capacity: s.capacity,
    enrolled: s.enrolled,
    isEnrolled: s.isEnrolled,
    startsAt: s.startsAt,
    roomLabel: s.roomLabel,
    joinUrl: s.joinUrl,
    embedVideoUrl: s.embedVideoUrl,
    demo: true,
  };
}

export function VirtualClassroomHub() {
  const { locale, authUserId, profile } = useKampus();
  const searchParams = useSearchParams();
  const scheduleIdParam = searchParams.get("scheduleId");
  const classDateParam = searchParams.get("classDate");
  const es = locale === "es";
  const isTeacher = profile.role === "teacher";
  const t = navCopy.es;
  const c = collaborateCopy.es;
  const [schedulePrefill, setSchedulePrefill] = useState<VirtualClassSchedulePrefill | null>(null);
  /** Modo demo: cookie kampus_demo=1 sin sesión de Supabase. Las sesiones viven en este dispositivo. */
  const [demoMode, setDemoMode] = useState(false);
  const [demoSessions, setDemoSessions] = useState<UiSession[]>([]);

  useEffect(() => {
    const demo = isDemoModeClient() && !authUserId;
    setDemoMode(demo);
    if (demo) setDemoSessions(loadDemoVcSessions().map(demoSessionToUi));
  }, [authUserId]);

  function reloadDemoSessions() {
    setDemoSessions(loadDemoVcSessions().map(demoSessionToUi));
  }
  const { data, error: loadError, isLoading, mutate } = useSupabaseSWR<UiSession[]>(
    authUserId ? `vc_sessions:${authUserId}` : null,
    async (supabase) => {
      const enrolledIds = await fetchMyVirtualClassSessionIds(supabase, authUserId!);
      const { data, error } = await supabase
        .from("virtual_class_sessions")
        .select(
          "id,course,professor_name,topic,capacity,starts_at,room_label,join_url,embed_video_url,virtual_class_roster(count)",
        )
        .order("starts_at", { ascending: true })
        .limit(30);
      if (error) throw error;
      const mapped = ((data as SessionRow[]) ?? []).map((row) => ({
        id: row.id,
        course: row.course,
        professor: row.professor_name,
        topic: row.topic,
        capacity: row.capacity,
        enrolled: row.virtual_class_roster?.[0]?.count ?? 0,
        isEnrolled: enrolledIds.has(row.id),
        startsAt: row.starts_at,
        roomLabel: row.room_label,
        joinUrl: row.join_url ?? null,
        embedVideoUrl: row.embed_video_url ?? null,
      }));
      return mapped;
    },
  );

  const [enrollBusy, setEnrollBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!authUserId || !scheduleIdParam || !classDateParam) {
      setSchedulePrefill(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const rows = await fetchClassScheduleRemote(supabase, authUserId);
        const row = rows.find((r) => r.id === scheduleIdParam);
        if (!row || cancelled) return;
        const startsIso = startsAtFromScheduleSlot(classDateParam, row.startTime);
        const endsIso = endsAtFromScheduleSlot(classDateParam, row.endTime);
        const pad = (n: number) => String(n).padStart(2, "0");
        const toLocal = (iso: string) => {
          const d = new Date(iso);
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        setSchedulePrefill({
          scheduleRowId: row.id,
          classDate: classDateParam,
          subject: row.subject,
          professorName: row.professorName,
          location: row.location,
          startsLocal: toLocal(startsIso),
          endsLocal: toLocal(endsIso),
        });
      } catch {
        if (!cancelled) setSchedulePrefill(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId, scheduleIdParam, classDateParam]);

  const sessions = useMemo(
    () => (demoMode ? demoSessions : (data ?? [])),
    [demoMode, demoSessions, data],
  );

  async function handleEnroll(sessionId: string) {
    if (demoMode) {
      toggleDemoVcEnrollment(sessionId);
      reloadDemoSessions();
      return;
    }
    if (!authUserId) return;
    setEnrollBusy(sessionId);
    try {
      const supabase = createSupabaseBrowserClient();
      const result = await enrollVirtualClassSession(supabase, sessionId);
      if (!result.ok && result.error !== "full") {
        return;
      }
      await mutate();
    } finally {
      setEnrollBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <CollaborateSubnav />

      <PageHeader
        eyebrow={isTeacher ? (es ? "Enseñanza" : "Teaching") : c.eyebrow}
        title={c.classroomPageTitle}
        description={
          isTeacher
            ? es
              ? "Crea sesiones en vivo para tus materias: comparte el enlace con tu alumnado, gestiona el roster y revisa grabaciones y asistencia."
              : "Create live sessions for your courses: share the link with your students, manage the roster, and review recordings and attendance."
            : c.classroomPageDescription
        }
      />

      {!isSupabaseConfigured() ? (
        <p className="text-sm text-amber-200/90">
          {es
            ? "Falta configurar Supabase para ver sesiones reales."
            : "Supabase is not configured, so real sessions are unavailable."}
        </p>
      ) : demoMode ? (
        <p className="rounded-xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {es
            ? "Sesiones de demostración: se guardan en este dispositivo y no se comparten."
            : "Demo sessions: they are saved on this device and are not shared."}
        </p>
      ) : !authUserId ? (
        <p className="text-sm text-slate-400">
          {es
            ? isTeacher
              ? "Inicia sesión para crear y gestionar tus clases en el aula virtual."
              : "Inicia sesión para ver tus sesiones de aula virtual."
            : "Sign in to see your virtual classroom sessions."}
        </p>
      ) : loadError ? (
        <p className="text-sm text-rose-200/90">{loadError}</p>
      ) : isLoading ? (
        <p className="text-sm text-slate-400">{es ? "Cargando sesiones…" : "Loading sessions…"}</p>
      ) : null}

      {authUserId && isSupabaseConfigured() ? (
        <VirtualClassroomOnboardingPanel sessionCount={sessions.length} onDemoCreated={() => void mutate()} />
      ) : null}

      {authUserId && isSupabaseConfigured() ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <VirtualClassIcsExportButton />
          <VirtualClassWebcalPanel />
        </div>
      ) : null}

      <VirtualClassroomCreateForm
        onCreated={() => {
          if (demoMode) reloadDemoSessions();
          else void mutate();
        }}
        schedulePrefill={schedulePrefill}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {!isLoading && sessions.length === 0 && (authUserId || demoMode) ? (
          <Card className="border-white/10 bg-slate-950/40">
            <CardHeader>
              <CardTitle>{es ? "Sin sesiones" : "No sessions"}</CardTitle>
              <CardDescription>
              {isTeacher
                ? es
                  ? "Aún no hay sesiones. Crea tu primera clase en vivo con el formulario de abajo."
                  : "No sessions yet. Create your first live class with the form below."
                : c.virtualClassEmptyHint}
            </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
        {sessions.map((s) => {
          const seatsLeft = Math.max(0, s.capacity - s.enrolled);
          const full = seatsLeft === 0;
          return (
            <Card key={s.id} className="border-white/10 bg-slate-950/40">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg text-white">{s.course}</CardTitle>
                    <CardDescription className="mt-1 text-slate-400">
                      {s.professor} · {s.roomLabel}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {s.demo ? <Badge tone="accent">{es ? "Demo" : "Demo"}</Badge> : null}
                    <Badge tone={full ? "danger" : seatsLeft <= 3 ? "warning" : "success"}>
                      {full ? (es ? "Lleno" : "Full") : `${seatsLeft} ${es ? "cupos" : "seats"}`}
                    </Badge>
                  </div>
                </div>
                <div className="text-sm text-slate-200">
                  <span className="text-slate-500">{es ? "Tema:" : "Topic:"}</span> {s.topic}
                </div>
                <div className="text-xs text-slate-500">
                  {es ? "Inicio (demo):" : "Starts (demo):"}{" "}
                  <span suppressHydrationWarning>
                    {new Date(s.startsAt).toLocaleString(es ? "es" : "en", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                  {" · "}
                  {s.enrolled}/{s.capacity} {es ? "inscritos" : "enrolled"}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {isTeacher ? (
                    <>
                      <Link
                        href={`/collaborate/aula-virtual/${encodeURIComponent(s.id)}`}
                        className={buttonClasses({ size: "sm", className: "gap-2" })}
                      >
                        <Video className="h-4 w-4" />
                        {c.virtualClassEnter}
                      </Link>
                      <a
                        href={vcWhatsappShareUrl(
                          buildVcWhatsappMessage({
                            course: s.course,
                            startsAt: s.startsAt,
                            roomLabel: s.roomLabel,
                            joinUrl: s.joinUrl,
                          }),
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={mailboxCopy.es.whatsappHint}
                        className={buttonClasses({ size: "sm", variant: "secondary", className: "gap-2" })}
                      >
                        <MessageCircle className="h-4 w-4" />
                        {mailboxCopy.es.whatsappCta}
                      </a>
                    </>
                  ) : full ? (
                    <Button type="button" size="sm" disabled>
                      {c.virtualClassNoSeats}
                    </Button>
                  ) : s.isEnrolled ? (
                    <Link
                      href={`/collaborate/aula-virtual/${encodeURIComponent(s.id)}`}
                      className={buttonClasses({ size: "sm", className: "gap-2" })}
                    >
                      <Video className="h-4 w-4" />
                      {c.virtualClassEnter}
                    </Link>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={enrollBusy === s.id}
                      onClick={() => void handleEnroll(s.id)}
                      className="gap-2"
                    >
                      <Video className="h-4 w-4" />
                      {enrollBusy === s.id ? c.virtualClassEnrolling : c.virtualClassEnroll}
                    </Button>
                  )}
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
