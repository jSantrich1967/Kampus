"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Clock, Loader2, Mic2, Plus, RefreshCw, Sparkles, Trash2, Video, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  defaultPresentationState,
  generateTeamSessionCode,
  loadPresentation,
  savePresentation,
  type PresentationSection,
  type PresentationState,
} from "@/lib/storage/presentation-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { PresentationTutorFeedback } from "@/lib/schemas/presentation-tutor";
import { fetchPresentationAgendaRemote, upsertPresentationAgendaRemote } from "@/lib/supabase/agenda-db";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function PresentationPlanner() {
  const { locale, profile, authUserId } = useKampus();
  const es = locale === "es";
  const searchParams = useSearchParams();

  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<PresentationState>(defaultPresentationState);
  const [rehearsalSeconds, setRehearsalSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [teleIndex, setTeleIndex] = useState(0);
  const [codeCopied, setCodeCopied] = useState(false);
  const [tutorNotes, setTutorNotes] = useState("");
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const [tutorFeedback, setTutorFeedback] = useState<PresentationTutorFeedback | null>(null);

  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [transcribing, setTranscribing] = useState(false);

  /** Si abren el enlace de convocatoria, alinean el mismo código de sesión en su dispositivo. */
  useEffect(() => {
    const raw = searchParams.get("equipo")?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") ?? "";
    if (raw.length < 6) return;
    const equipo = raw.slice(0, 8);
    setState((prev) => {
      if (prev.teamSessionCode === equipo) return prev;
      return { ...prev, teamSessionCode: equipo };
    });
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const loc = loadPresentation();
    setState(loc);

    const done = () => {
      if (!cancelled) setHydrated(true);
    };

    if (!isSupabaseConfigured() || !authUserId) {
      done();
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const remote = await fetchPresentationAgendaRemote(supabase, authUserId);
        if (cancelled || !remote) return;
        setState((prev) => ({
          ...prev,
          deckTitle: remote.deckTitle.trim() ? remote.deckTitle : prev.deckTitle,
          presentationDueDate: remote.presentationDueDate ?? prev.presentationDueDate,
        }));
      } finally {
        done();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  function resetDemoToDefaults() {
    // Los defaults cambiaron a español, pero el usuario puede tener un estado viejo en localStorage.
    // Esto fuerza un “reset” para que vea la UI limpia sin abrir DevTools.
    const next: PresentationState = { ...defaultPresentationState, teamSessionCode: generateTeamSessionCode() };
    setState(next);
    savePresentation(next);
    setTutorNotes("");
    setTutorFeedback(null);
    setTutorError(null);
    setTeleIndex(0);
    setRunning(false);
    setRehearsalSeconds(0);
  }

  async function startRecording() {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(es ? "Tu navegador no soporta cámara/micrófono." : "Your browser does not support camera/mic.");
        return;
      }

      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
      setRecordedBlob(null);
      setRecordedAudioBlob(null);

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      liveStreamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play().catch(() => {});
      }

      const mimeCandidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
      const mimeType = mimeCandidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
      };

      // Separate audio-only recorder to keep uploads small and reduce network failures.
      const audioStream = new MediaStream(stream.getAudioTracks());
      const audioMimeCandidates = ["audio/webm;codecs=opus", "audio/webm"];
      const audioMimeType = audioMimeCandidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      const audioRecorder = new MediaRecorder(audioStream, audioMimeType ? { mimeType: audioMimeType } : undefined);
      audioRecorderRef.current = audioRecorder;

      audioRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      audioRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: audioRecorder.mimeType || "audio/webm" });
        setRecordedAudioBlob(blob);
      };

      recorder.start();
      audioRecorder.start();
      setRecording(true);
    } catch (e) {
      setCameraError(es ? "No se pudo acceder a cámara/micrófono." : "Could not access camera/mic.");
      console.error(e);
    }
  }

  function stopRecording() {
    try {
      recorderRef.current?.stop();
    } catch {}
    try {
      audioRecorderRef.current?.stop();
    } catch {}
    setRecording(false);
    recorderRef.current = null;
    audioRecorderRef.current = null;
    if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
    liveStreamRef.current?.getTracks().forEach((t) => t.stop());
    liveStreamRef.current = null;
  }

  async function transcribeAndGrade() {
    const blob = recordedAudioBlob ?? recordedBlob;
    if (!blob) return;
    setTranscribing(true);
    setTutorError(null);
    try {
      const fd = new FormData();
      fd.append("file", blob, recordedAudioBlob ? "rehearsal-audio.webm" : "rehearsal.webm");
      const res = await fetch("/api/presentation/transcribe", { method: "POST", body: fd });
      const raw = await res.text();
      let json: { transcript?: string; error?: string } = {};
      try {
        json = (JSON.parse(raw) as { transcript?: string; error?: string }) ?? {};
      } catch {
        json = {};
      }
      if (!res.ok) {
        setTutorError(
          json.error ??
            (raw.trim()
              ? `${es ? "Error al transcribir" : "Transcribe error"} (HTTP ${res.status}): ${raw.slice(0, 160)}`
              : `${es ? "Error al transcribir" : "Transcribe error"} (HTTP ${res.status}).`),
        );
        return;
      }
      const transcript = (json.transcript ?? "").trim();
      if (!transcript) {
        setTutorError(
          raw.trim()
            ? `${es ? "Transcripción vacía." : "Empty transcript."} ${raw.slice(0, 160)}`
            : es
              ? "La transcripción llegó vacía."
              : "Empty transcript.",
        );
        return;
      }
      setTutorNotes(transcript);
      await requestTutorFeedback();
    } catch {
      setTutorError(
        es
          ? "No se pudo contactar al servidor para transcribir (fallo de red). Si estás en local, confirma que el servidor está corriendo y recarga."
          : "Could not reach the server to transcribe (network failure). If running locally, ensure the dev server is up and reload.",
      );
    } finally {
      setTranscribing(false);
    }
  }

  useEffect(() => {
    return () => {
      try {
        recorderRef.current?.stop();
      } catch {}
      try {
        audioRecorderRef.current?.stop();
      } catch {}
      liveStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [recordedUrl]);

  useEffect(() => {
    if (!hydrated) return;
    savePresentation(state);
  }, [hydrated, state]);

  useEffect(() => {
    if (!hydrated || !isSupabaseConfigured() || !authUserId) return;
    const supabase = createSupabaseBrowserClient();
    const handle = window.setTimeout(() => {
      void upsertPresentationAgendaRemote(supabase, authUserId, state.deckTitle, state.presentationDueDate);
    }, 700);
    return () => window.clearTimeout(handle);
  }, [hydrated, authUserId, state.deckTitle, state.presentationDueDate]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setRehearsalSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const memberById = useMemo(() => new Map(state.members.map((m) => [m.id, m])), [state.members]);

  const teleText = useMemo(() => {
    const sec = state.sections[teleIndex];
    if (!sec) return state.masterScript;
    return `${sec.title}\n\n${sec.script}\n\n— ${memberById.get(sec.ownerId)?.name ?? "Speaker"}`;
  }, [memberById, state.masterScript, state.sections, teleIndex]);

  function updateSection(id: string, patch: Partial<PresentationSection>) {
    setState((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }

  function addSection() {
    const ownerId = state.members[0]?.id ?? "m1";
    setState((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        { id: uid(), title: es ? "Nueva sección" : "New section", ownerId, minutes: 2, script: "" },
      ],
    }));
  }

  function removeSection(id: string) {
    setState((prev) => ({ ...prev, sections: prev.sections.filter((s) => s.id !== id) }));
  }

  function addMember() {
    setState((prev) => ({
      ...prev,
      members: [...prev.members, { id: uid(), name: es ? "Compañero" : "Teammate", role: es ? "Rol" : "Role" }],
    }));
  }

  function removeMember(id: string) {
    setState((prev) => {
      const remaining = prev.members.filter((m) => m.id !== id);
      const fallback = remaining[0]?.id ?? "";
      return {
        ...prev,
        members: remaining,
        sections: prev.sections.map((s) => (s.ownerId === id ? { ...s, ownerId: fallback || s.ownerId } : s)),
      };
    });
  }

  const mm = String(Math.floor(rehearsalSeconds / 60)).padStart(2, "0");
  const ss = String(rehearsalSeconds % 60).padStart(2, "0");

  const sectionsSummary = useMemo(
    () =>
      state.sections
        .map((s) => {
          const who = memberById.get(s.ownerId)?.name ?? "?";
          return `## ${s.title} (${who}, ${s.minutes} min)\n${s.script}`;
        })
        .join("\n\n"),
    [memberById, state.sections],
  );

  async function requestTutorFeedback() {
    setTutorLoading(true);
    setTutorError(null);
    try {
      const res = await fetch("/api/presentation/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deckTitle: state.deckTitle,
          rehearsalNotes: tutorNotes,
          masterScript: state.masterScript,
          sectionsSummary,
          juryNotes: state.juryNotes,
          probableQuestions: state.probableQuestions,
        }),
      });
      const raw = await res.text();
      let json: { feedback?: PresentationTutorFeedback; error?: string } = {};
      try {
        json = (JSON.parse(raw) as { feedback?: PresentationTutorFeedback; error?: string }) ?? {};
      } catch {
        json = {};
      }
      if (!res.ok) {
        setTutorError(
          json.error ??
            (raw.trim()
              ? `${es ? "Error del tutor" : "Tutor error"} (HTTP ${res.status}): ${raw.slice(0, 160)}`
              : `${es ? "Error del tutor" : "Tutor error"} (HTTP ${res.status}).`),
        );
        return;
      }
      if (json.feedback) setTutorFeedback(json.feedback);
    } catch {
      setTutorError(es ? "Error de red. Inténtalo otra vez." : "Network error. Try again.");
    } finally {
      setTutorLoading(false);
    }
  }

  if (!hydrated) {
    return <div className="text-sm text-slate-400">{es ? "Cargando…" : "Loading…"}</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200/80">Colaboración</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {es ? "Mis exposiciones" : "My presentations"}
        </h1>
        <p className="mt-2 max-w-3xl text-base text-slate-300">
          {es
            ? "Pon nombre a la sesión, comparte el enlace y el código para que todos confluyan aquí; en Aula virtual pueden verse y hablar en vivo mientras ensayan."
            : "Name the session, share the link and code so everyone lands here; use Virtual classroom for live video while you rehearse."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ShareLinkButton
            pathname="/collaborate/exposiciones"
            campaign="presentation_team"
            extra={{ deck: state.deckTitle, equipo: state.teamSessionCode }}
            refHandle={profile.university || "kampus"}
            label={es ? "Copiar enlace de convocatoria" : "Copy invite link"}
            copiedLabel={es ? "Copiado" : "Copied"}
          />
          <Link href="/collaborate/aula-virtual" className={buttonClasses({ variant: "secondary", size: "sm", className: "gap-2" })}>
            <Video className="h-4 w-4" />
            {es ? "Aula virtual (vivo)" : "Virtual classroom (live)"}
          </Link>
          <Button type="button" size="sm" variant="ghost" onClick={resetDemoToDefaults}>
            {es ? "Restablecer demo" : "Reset demo"}
          </Button>
        </div>
      </div>

      <Card className="border-indigo-400/25 bg-indigo-500/[0.06]">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-indigo-50">
            <Users className="h-5 w-5 text-indigo-200" />
            {es ? "Convocatoria: misma sección para todos" : "Rally: one shared space"}
          </CardTitle>
          <CardDescription className="text-indigo-100/80">
            {es
              ? "El nombre del deck es cómo se llama esta sección para el grupo. El código y el enlace sirven para que cada quien abra Mis exposiciones alineado contigo; el guion sigue siendo local en cada dispositivo hasta que tengamos sync en nube."
              : "The deck title is how you refer to this session. The code and link help everyone open the same Mis exposiciones entry; scripts stay local per device until cloud sync exists."}
          </CardDescription>
        </CardHeader>
        <div className="space-y-4 px-5 pb-5">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-indigo-200/90">
              {es ? "Código de encuentro" : "Meet-up code"}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="rounded-xl border border-white/15 bg-slate-950/60 px-4 py-2 font-mono text-2xl font-semibold tracking-[0.2em] text-white">
                {state.teamSessionCode || "—"}
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-2"
                disabled={!state.teamSessionCode}
                onClick={() => {
                  if (!state.teamSessionCode) return;
                  void navigator.clipboard.writeText(state.teamSessionCode);
                  setCodeCopied(true);
                  window.setTimeout(() => setCodeCopied(false), 2000);
                }}
              >
                {codeCopied ? <Check className="h-4 w-4 text-emerald-300" /> : null}
                {codeCopied ? (es ? "Copiado" : "Copied") : es ? "Copiar código" : "Copy code"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="gap-1 text-indigo-200 hover:text-white"
                onClick={() => {
                  setState((p) => ({ ...p, teamSessionCode: generateTeamSessionCode() }));
                  setCodeCopied(false);
                }}
              >
                <RefreshCw className="h-4 w-4" />
                {es ? "Nuevo código" : "New code"}
              </Button>
            </div>
          </div>
          <p className="text-sm text-slate-300">
            {es ? (
              <>
                Pide al equipo que use el <strong className="text-white">mismo nombre de deck</strong> abajo y, si abren
                por enlace, que el código coincida. Para interactuar en vivo (voz/vídeo), entren a{" "}
                <Link href="/collaborate/aula-virtual" className="text-indigo-200 underline-offset-2 hover:underline">
                  Aula virtual
                </Link>
                .
              </>
            ) : (
              <>
                Ask everyone to use the <strong className="text-white">same deck title</strong> below and matching code
                if they use the invite link. For live interaction, join{" "}
                <Link href="/collaborate/aula-virtual" className="text-indigo-200 underline-offset-2 hover:underline">
                  Virtual classroom
                </Link>
                .
              </>
            )}
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{es ? "Título del deck" : "Deck title"}</CardTitle>
          <CardDescription>
            {es ? "Comparte este nombre en tu aula virtual." : "Share this name in your virtual classroom."}
          </CardDescription>
        </CardHeader>
        <input
          className="mx-5 mb-5 w-[calc(100%-2.5rem)] rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-indigo-400/40 focus:ring"
          value={state.deckTitle}
          onChange={(e) => setState((p) => ({ ...p, deckTitle: e.target.value }))}
        />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{es ? "Fecha en Mi calendario" : "Date on My calendar"}</CardTitle>
          <CardDescription>
            {es
              ? "Opcional: día de la exposición o ensayo general. Se muestra junto a exámenes y trabajos en Evaluación → Mi calendario."
              : "Optional: presentation or dress rehearsal day. Shown with exams and assignments under Evaluation → My calendar."}
          </CardDescription>
        </CardHeader>
        <div className="px-5 pb-5">
          <input
            type="date"
            className="w-full max-w-xs rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none ring-indigo-400/40 focus:ring"
            value={state.presentationDueDate ?? ""}
            onChange={(e) => setState((p) => ({ ...p, presentationDueDate: e.target.value || undefined }))}
          />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>{es ? "Equipo y roles" : "Team & roles"}</CardTitle>
              <CardDescription>
                {es
                  ? "Mismas personas que en la convocatoria: nombres y roles para asignar secciones y teleprompter."
                  : "Same people as in the rally: names and roles to assign sections and teleprompter."}
              </CardDescription>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={addMember} className="gap-1">
              <Plus className="h-4 w-4" />
              {es ? "Miembro" : "Member"}
            </Button>
          </CardHeader>
          <div className="space-y-3 px-5 pb-5">
            {state.members.map((m) => (
              <div key={m.id} className="grid gap-2 rounded-xl border border-white/10 bg-slate-950/40 p-3 md:grid-cols-[1fr_1fr_auto] md:items-center">
                <input
                  className="rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1 text-sm"
                  value={m.name}
                  onChange={(e) =>
                    setState((p) => ({
                      ...p,
                      members: p.members.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)),
                    }))
                  }
                />
                <input
                  className="rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1 text-sm"
                  value={m.role}
                  onChange={(e) =>
                    setState((p) => ({
                      ...p,
                      members: p.members.map((x) => (x.id === m.id ? { ...x, role: e.target.value } : x)),
                    }))
                  }
                />
                <Button type="button" variant="ghost" size="sm" className="justify-self-end" onClick={() => removeMember(m.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>{es ? "Ensayo + ritmo" : "Rehearsal + pacing"}</CardTitle>
              <CardDescription>{es ? "Cronómetro simple para corridas completas." : "Simple timer for full run-throughs."}</CardDescription>
            </div>
            <Mic2 className="h-5 w-5 text-indigo-200" />
          </CardHeader>
          <div className="space-y-4 px-5 pb-5">
            <div className="text-4xl font-semibold tracking-tight text-white">
              {mm}:{ss}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={running ? "danger" : "primary"} onClick={() => setRunning((r) => !r)}>
                {running ? (es ? "Pausar" : "Pause") : es ? "Iniciar" : "Start"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setRehearsalSeconds(0)}>
                {es ? "Reiniciar" : "Reset"}
              </Button>
            </div>
            <p className="text-xs text-slate-400">
              {es
                ? "Consejo: una corrida completa vale más que diez repasos sueltos de diapositivas."
                : "Tip: one full run beats ten slide skim passes."}
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>{es ? "Secciones (guion por bloque)" : "Sections (script blocks)"}</CardTitle>
            <CardDescription>
              {es ? "Asigna expositor y minutos — esto alimenta el teleprompter." : "Assign presenter + minutes — feeds the teleprompter."}
            </CardDescription>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={addSection} className="gap-1">
            <Plus className="h-4 w-4" />
            {es ? "Sección" : "Section"}
          </Button>
        </CardHeader>
        <div className="space-y-4 px-5 pb-5">
          {state.sections.map((s) => (
            <div key={s.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_140px_120px_auto] md:items-end">
                <label className="space-y-1 text-xs text-slate-400">
                  {es ? "Título" : "Title"}
                  <input
                    className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-2 py-2 text-sm text-white"
                    value={s.title}
                    onChange={(e) => updateSection(s.id, { title: e.target.value })}
                  />
                </label>
                <label className="space-y-1 text-xs text-slate-400">
                  {es ? "Expositor" : "Presenter"}
                  <select
                    className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-2 py-2 text-sm text-white"
                    value={s.ownerId}
                    onChange={(e) => updateSection(s.id, { ownerId: e.target.value })}
                  >
                    {state.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> min
                  </span>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-2 py-2 text-sm text-white"
                    value={s.minutes}
                    onChange={(e) => updateSection(s.id, { minutes: Number(e.target.value) })}
                  />
                </label>
                <Button type="button" variant="ghost" className="justify-self-end" onClick={() => removeSection(s.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <label className="mt-3 block space-y-1 text-xs text-slate-400">
                {es ? "Guión individual" : "Individual script"}
                <textarea
                  className="min-h-24 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
                  value={s.script}
                  onChange={(e) => updateSection(s.id, { script: e.target.value })}
                />
              </label>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{es ? "Guión maestro (continuidad)" : "Master script (continuity)"}</CardTitle>
          <CardDescription>{es ? "Puente entre secciones + cierre." : "Bridges between sections + close."}</CardDescription>
        </CardHeader>
        <textarea
          className="mx-5 mb-5 min-h-28 w-[calc(100%-2.5rem)] rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
          value={state.masterScript}
          onChange={(e) => setState((p) => ({ ...p, masterScript: e.target.value }))}
        />
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{es ? "Teleprompter" : "Teleprompter"}</CardTitle>
            <CardDescription>{es ? "Lectura cómoda para ensayo." : "Comfortable reading for rehearsal."}</CardDescription>
          </CardHeader>
          <div className="space-y-3 px-5 pb-5">
            <div className="flex flex-wrap gap-2">
              {state.sections.map((s, idx) => (
                <Button key={s.id} type="button" size="sm" variant={teleIndex === idx ? "secondary" : "ghost"} onClick={() => setTeleIndex(idx)}>
                  {idx + 1}. {s.title}
                </Button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-xs text-slate-400">
                {es ? "Tamaño de fuente" : "Font size"}
                <input
                  type="range"
                  min={18}
                  max={42}
                  value={state.teleprompterFontPx}
                  onChange={(e) => setState((p) => ({ ...p, teleprompterFontPx: Number(e.target.value) }))}
                />
              </label>
              <label className="space-y-1 text-xs text-slate-400">
                {es ? "Interlineado" : "Line height"}
                <input
                  type="range"
                  min={110}
                  max={170}
                  value={Math.round(state.teleprompterLineHeight * 100)}
                  onChange={(e) => setState((p) => ({ ...p, teleprompterLineHeight: Number(e.target.value) / 100 }))}
                />
              </label>
            </div>
            <div
              className="rounded-2xl border border-white/10 bg-black/40 p-5 text-slate-100 shadow-inner"
              style={{ fontSize: state.teleprompterFontPx, lineHeight: state.teleprompterLineHeight }}
            >
              {teleText}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{es ? "Jurado simulado + preguntas" : "Mock jury + questions"}</CardTitle>
            <CardDescription>{es ? "Presión útil sin humillar." : "Useful pressure without shame."}</CardDescription>
          </CardHeader>
          <div className="space-y-3 px-5 pb-5 text-sm text-slate-200">
            <label className="block space-y-1 text-xs text-slate-400">
              {es ? "Preguntas probables (una por línea)" : "Probable questions (one per line)"}
              <textarea
                className="min-h-28 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                value={state.probableQuestions.join("\n")}
                onChange={(e) =>
                  setState((p) => ({
                    ...p,
                    probableQuestions: e.target.value
                      .split("\n")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </label>
            <label className="block space-y-1 text-xs text-slate-400">
              {es ? "Notas del jurado" : "Jury notes"}
              <textarea
                className="min-h-24 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                value={state.juryNotes}
                onChange={(e) => setState((p) => ({ ...p, juryNotes: e.target.value }))}
              />
            </label>
            <ul className="list-disc space-y-2 pl-5 text-slate-300">
              {state.probableQuestions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <Card className="border-white/10 bg-slate-950/40">
        <CardHeader>
          <CardTitle>{es ? "Grabación del ensayo (cámara)" : "Rehearsal recording (camera)"}</CardTitle>
          <CardDescription>
            {es
              ? "Graba al grupo, reproduce el video y luego transcribe para que el tutor califique."
              : "Record the group, play it back, then transcribe so the tutor can grade."}
          </CardDescription>
        </CardHeader>
        <div className="space-y-4 px-5 pb-5">
          {cameraError ? <p className="text-sm text-rose-300">{cameraError}</p> : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{es ? "Vista en vivo" : "Live"}</div>
              <video
                ref={liveVideoRef}
                className="aspect-video w-full rounded-2xl border border-white/10 bg-black"
                muted
                playsInline
              />
              <div className="flex flex-wrap gap-2">
                {!recording ? (
                  <Button type="button" variant="primary" onClick={() => void startRecording()}>
                    {es ? "Iniciar grabación" : "Start recording"}
                  </Button>
                ) : (
                  <Button type="button" variant="danger" onClick={stopRecording}>
                    {es ? "Detener" : "Stop"}
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {es
                  ? "Consejo: pon el celular/laptop a la altura de los ojos y mide el tiempo real de cada sección."
                  : "Tip: keep the camera at eye level and time each section."}
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{es ? "Reproducción" : "Playback"}</div>
              {recordedUrl ? (
                <video
                  src={recordedUrl}
                  className="aspect-video w-full rounded-2xl border border-white/10 bg-black"
                  controls
                  playsInline
                />
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-sm text-slate-500">
                  {es ? "Aún no hay grabación." : "No recording yet."}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!recordedBlob || transcribing || tutorLoading}
                  onClick={() => void transcribeAndGrade()}
                  className="gap-2"
                >
                  {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {transcribing ? (es ? "Transcribiendo…" : "Transcribing…") : es ? "Transcribir y calificar" : "Transcribe & grade"}
                </Button>
                {recordedUrl ? (
                  <a
                    href={recordedUrl}
                    download="kampus-rehearsal.webm"
                    className={buttonClasses({ variant: "ghost", size: "sm" })}
                  >
                    {es ? "Descargar" : "Download"}
                  </a>
                ) : null}
              </div>
              <p className="text-[11px] text-slate-500">
                {es
                  ? "Privacidad: el video se queda en tu navegador. Para calificar, se sube solo el audio (más liviano) cuando presionas “Transcribir y calificar”."
                  : "Privacy: the video stays in your browser. For grading, we upload only the audio (lighter) when you press “Transcribe & grade”."}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-emerald-400/20 bg-emerald-500/[0.05]">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-emerald-50">
            <Sparkles className="h-5 w-5 text-emerald-300" />
            {es ? "Tutor calificador (IA)" : "AI grading tutor"}
          </CardTitle>
          <CardDescription className="text-emerald-100/75">
            {es
              ? "Pega notas del ensayo, una transcripción breve o lo que salió mal/bien. El tutor usa también tus guiones y preguntas del jurado. Requiere OPENAI_API_KEY en el servidor."
              : "Paste rehearsal notes or a short transcript. The tutor also uses your scripts and mock jury. Requires OPENAI_API_KEY on the server."}
          </CardDescription>
        </CardHeader>
        <div className="space-y-4 px-5 pb-5">
          <label className="block space-y-1 text-xs text-slate-400">
            {es ? "Notas del ensayo / transcripción (obligatorio para calificar)" : "Rehearsal notes / transcript (required)"}
            <textarea
              className="min-h-32 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
              value={tutorNotes}
              onChange={(e) => setTutorNotes(e.target.value)}
              placeholder={
                es
                  ? "Ej.: «Se nos acabó el tiempo en la sección 2», «Confundimos dos gráficas», «Nos preguntaron por X y no supimos responder»…"
                  : "What happened in the rehearsal, timing issues, Q&A gaps…"
              }
            />
          </label>
          <Button type="button" className="gap-2" disabled={tutorLoading} onClick={() => void requestTutorFeedback()}>
            {tutorLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {tutorLoading ? (es ? "Calificando…" : "Grading…") : es ? "Pedir calificación y consejos" : "Get grade and tips"}
          </Button>
          {tutorError ? <p className="text-sm text-rose-300">{tutorError}</p> : null}
          {tutorFeedback ? (
            <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-200">
              <div className="text-base font-semibold text-white">{tutorFeedback.overallScoreLabel}</div>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-300/90">
                  {es ? "Lo que salió bien" : "What went well"}
                </div>
                <ul className="list-disc space-y-1 pl-5">
                  {tutorFeedback.strengths.map((x, i) => (
                    <li key={`s-${i}`}>{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-200/90">
                  {es ? "A mejorar" : "To improve"}
                </div>
                <ul className="list-disc space-y-1 pl-5">
                  {tutorFeedback.toImprove.map((x, i) => (
                    <li key={`i-${i}`}>{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-200/90">
                  {es ? "Cómo seguir" : "Next steps"}
                </div>
                <ul className="list-disc space-y-1 pl-5">
                  {tutorFeedback.concreteTips.map((x, i) => (
                    <li key={`t-${i}`}>{x}</li>
                  ))}
                </ul>
              </div>
              <p className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-slate-300">{tutorFeedback.closingEncouragement}</p>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
