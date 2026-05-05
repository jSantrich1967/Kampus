"use client";

import Link from "next/link";
import { Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { navCopy } from "@/lib/i18n/nav";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

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
  startsAt: string;
  roomLabel: string;
  joinUrl: string | null;
  embedVideoUrl: string | null;
};

export function VirtualClassroomHub() {
  const { locale, authUserId } = useKampus();
  const es = locale === "es";
  const t = navCopy.es;
  const [sessions, setSessions] = useState<UiSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!authUserId || !isSupabaseConfigured()) {
      setSessions([]);
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
            "id,course,professor_name,topic,capacity,starts_at,room_label,join_url,embed_video_url,virtual_class_roster(count)",
          )
          .order("starts_at", { ascending: true })
          .limit(30);
        if (error) throw error;
        if (cancelled) return;

        const mapped = ((data as SessionRow[]) ?? []).map((row) => ({
          id: row.id,
          course: row.course,
          professor: row.professor_name,
          topic: row.topic,
          capacity: row.capacity,
          enrolled: row.virtual_class_roster?.[0]?.count ?? 0,
          startsAt: row.starts_at,
          roomLabel: row.room_label,
          joinUrl: row.join_url ?? null,
          embedVideoUrl: row.embed_video_url ?? null,
        }));
        setSessions(mapped);
      } catch (e) {
        const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : null;
        setLoadError(msg || (es ? "No se pudo cargar el aula virtual." : "Could not load virtual classroom."));
        setSessions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUserId, es]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t.groups.work}
        title={es ? "Aula virtual" : "Virtual classroom"}
        description={
          es
            ? "Sesiones demo: horario, tema y cupo. La videollamada real depende de tu institución."
            : "Demo sessions: schedule, topic, seats. Live video depends on your institution."
        }
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
      ) : loading ? (
        <p className="text-sm text-slate-400">{es ? "Cargando sesiones…" : "Loading sessions…"}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {!loading && sessions.length === 0 && authUserId ? (
          <Card className="border-white/10 bg-slate-950/40">
            <CardHeader>
              <CardTitle>{es ? "Sin sesiones" : "No sessions"}</CardTitle>
              <CardDescription>
                {es
                  ? "Aún no tienes sesiones asignadas. Cuando un docente te agregue al roster, aparecerán aquí."
                  : "You don't have assigned sessions yet. Once an instructor adds you to the roster, they'll show up here."}
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
                      {es ? "Sin cupo" : "No seats"}
                    </Button>
                  ) : (
                    <Link
                      href={`/collaborate/aula-virtual/${encodeURIComponent(s.id)}`}
                      className={buttonClasses({ size: "sm", className: "gap-2" })}
                    >
                      <Video className="h-4 w-4" />
                      {es ? "Entrar al aula" : "Enter classroom"}
                    </Link>
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
