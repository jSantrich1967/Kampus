"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Presentation } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildVirtualClassSessions } from "@/lib/virtual-classroom-mock";

type Props = { sessionId: string };

function formatTime(total: number) {
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function VirtualClassroomSession({ sessionId }: Props) {
  const { profile, locale } = useKampus();
  const es = locale === "es";
  const sessions = useMemo(() => buildVirtualClassSessions(profile), [profile]);
  const session = useMemo(() => sessions.find((x) => x.id === sessionId) ?? null, [sessions, sessionId]);

  const [focusSeconds, setFocusSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setFocusSeconds((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

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
  const presHref = `/collaborate/presentations?from=aula&session=${encodeURIComponent(session.id)}`;

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
