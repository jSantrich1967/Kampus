"use client";

import Link from "next/link";
import { Video } from "lucide-react";
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
import { navCopy } from "@/lib/i18n/nav";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { enrollVirtualClassSession, fetchMyVirtualClassSessionIds } from "@/lib/supabase/virtual-class-db";
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
};

export function VirtualClassroomHub() {
  const { locale, authUserId } = useKampus();
  const searchParams = useSearchParams();
  const scheduleIdParam = searchParams.get("scheduleId");
  const classDateParam = searchParams.get("classDate");
  const es = locale === "es";
  const t = navCopy.es;
  const c = collaborateCopy.es;
  const [schedulePrefill, setSchedulePrefill] = useState<VirtualClassSchedulePrefill | null>(null);
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

  const sessions = useMemo(() => data ?? [], [data]);

  async function handleEnroll(sessionId: string) {
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
        eyebrow={c.eyebrow}
        title={c.classroomPageTitle}
        description={c.classroomPageDescription}
      />

      {!isSupabaseConfigured() ? (
        <p className="text-sm text-amber-200/90">
          {es
            ? "Falta configurar Supabase para ver sesiones reales."
            : "Supabase is not configured, so real sessions are unavailable."}
        </p>
      ) : !authUserId ? (
        <p className="text-sm text-slate-400">
          {es ? "Inicia sesión para ver tus sesiones de aula virtual." : "Sign in to see your virtual classroom sessions."}
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

      <VirtualClassroomCreateForm onCreated={() => void mutate()} schedulePrefill={schedulePrefill} />

      <div className="grid gap-4 md:grid-cols-2">
        {!isLoading && sessions.length === 0 && authUserId ? (
          <Card className="border-white/10 bg-slate-950/40">
            <CardHeader>
              <CardTitle>{es ? "Sin sesiones" : "No sessions"}</CardTitle>
              <CardDescription>{c.virtualClassEmptyHint}</CardDescription>
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
                  <Badge tone={full ? "danger" : seatsLeft <= 3 ? "warning" : "success"}>
                    {full ? (es ? "Lleno" : "Full") : `${seatsLeft} ${es ? "cupos" : "seats"}`}
                  </Badge>
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
                  {full ? (
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
