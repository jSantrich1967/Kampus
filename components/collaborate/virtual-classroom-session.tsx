"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Presentation } from "lucide-react";
import { useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Props = { sessionId: string };

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

function formatTime(total: number) {
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function VirtualClassroomSession({ sessionId }: Props) {
  const { locale, authUserId } = useKampus();
  const es = locale === "es";
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
            "id,course,professor_name,topic,capacity,starts_at,room_label,join_url,embed_video_url,virtual_class_roster(count)",
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
        setSession({
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
  const presHref = `/collaborate/exposiciones?from=aula&session=${encodeURIComponent(session.id)}`;

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
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{es ? "Clase (vídeo)" : "Class (video)"}</CardTitle>
            <CardDescription>
              {es
                ? "Si tu institución usa Meet/Zoom, aquí iría el embed o el botón de unión."
                : "If your school uses Meet/Zoom, the embed or join button would go here."}
            </CardDescription>
          </CardHeader>
          <div className="space-y-3 px-6 pb-6">
            {session.embedVideoUrl ? (
              <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
                <iframe
                  title={es ? "Vídeo de la clase" : "Class video"}
                  src={session.embedVideoUrl}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                {es ? "Demo sin vídeo embebido en esta sesión." : "No embedded video in this demo session."}
              </p>
            )}
            {session.joinUrl ? (
              <a
                href={session.joinUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonClasses({ variant: "secondary", className: "gap-2" })}
              >
                <ExternalLink className="h-4 w-4" />
                {es ? "Abrir videollamada" : "Open video call"}
              </a>
            ) : null}
          </div>
        </Card>

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
