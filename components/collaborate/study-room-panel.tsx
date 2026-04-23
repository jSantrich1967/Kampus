"use client";

import { Timer } from "lucide-react";
import { useEffect, useState } from "react";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { defaultStudyRoomState, loadStudyRoom, saveStudyRoom, type StudyRoomState } from "@/lib/storage/study-room-storage";

function formatTime(total: number) {
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function StudyRoomPanel() {
  const { locale, profile } = useKampus();
  const es = locale === "es";

  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<StudyRoomState>(defaultStudyRoomState);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setState(loadStudyRoom());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveStudyRoom(state);
  }, [hydrated, state]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setState((p) => ({ ...p, focusSeconds: p.focusSeconds + 1 }));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  if (!hydrated) {
    return <div className="text-sm text-slate-400">{es ? "Cargando…" : "Loading…"}</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200/80">Collaboration</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {es ? "Sala de estudio" : "Study room"}
        </h1>
        <p className="mt-2 max-w-3xl text-base text-slate-300">
          {es
            ? "Agenda compartida, meta, notas y temporizador — útil, no decorativo."
            : "Shared agenda, goal, notes, and timer — useful, not decorative."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ShareLinkButton
            pathname="/collaborate/rooms"
            campaign="study_room"
            extra={{ room: "demo", title: state.title }}
            refHandle={profile.university || "kampus"}
            label={es ? "Invitar a la sala" : "Invite to room"}
            copiedLabel={es ? "Copiado" : "Copied"}
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{es ? "Agenda + meta" : "Agenda + goal"}</CardTitle>
            <CardDescription>{es ? "Mantén la sesión con intención." : "Keep the session intentional."}</CardDescription>
          </CardHeader>
          <div className="space-y-4 px-5 pb-5">
            <label className="block space-y-1 text-xs text-slate-400">
              {es ? "Nombre de sesión" : "Session title"}
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                value={state.title}
                onChange={(e) => setState((p) => ({ ...p, title: e.target.value }))}
              />
            </label>
            <label className="block space-y-1 text-xs text-slate-400">
              {es ? "Meta compartida" : "Shared goal"}
              <textarea
                className="min-h-20 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                value={state.sharedGoal}
                onChange={(e) => setState((p) => ({ ...p, sharedGoal: e.target.value }))}
              />
            </label>
            <label className="block space-y-1 text-xs text-slate-400">
              {es ? "Agenda (una línea por ítem)" : "Agenda (one line per item)"}
              <textarea
                className="min-h-28 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                value={state.agenda.join("\n")}
                onChange={(e) =>
                  setState((p) => ({
                    ...p,
                    agenda: e.target.value
                      .split("\n")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </label>
          </div>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="inline-flex items-center gap-2">
                <Timer className="h-5 w-5 text-indigo-200" />
                {es ? "Enfoque" : "Focus"}
              </CardTitle>
              <CardDescription>{es ? "Temporizador de sesión" : "Session timer"}</CardDescription>
            </div>
          </CardHeader>
          <div className="space-y-3 px-5 pb-5">
            <div className="text-4xl font-semibold text-white">{formatTime(state.focusSeconds)}</div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={running ? "danger" : "primary"} onClick={() => setRunning((r) => !r)}>
                {running ? (es ? "Pausar" : "Pause") : es ? "Iniciar" : "Start"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setState((p) => ({ ...p, focusSeconds: 0 }))}>
                {es ? "Reiniciar" : "Reset"}
              </Button>
            </div>
            <p className="text-[11px] text-slate-500">
              {es ? "Invita desde el botón arriba — el enlace incluye parámetros de atribución." : "Invite from the button above — the link includes attribution params."}
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{es ? "Notas compartidas" : "Shared notes"}</CardTitle>
          <CardDescription>{es ? "Para acuerdos y bloqueos." : "For agreements and blockers."}</CardDescription>
        </CardHeader>
        <textarea
          className="mx-5 mb-5 min-h-36 w-[calc(100%-2.5rem)] rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
          value={state.notes}
          onChange={(e) => setState((p) => ({ ...p, notes: e.target.value }))}
          placeholder={es ? "Ej. ‘Nos atascamos en el ejercicio 3’…" : "e.g., ‘We got stuck on exercise 3’…"}
        />
      </Card>
    </div>
  );
}
