"use client";

import { Clock, Mic2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  defaultPresentationState,
  loadPresentation,
  savePresentation,
  type PresentationSection,
  type PresentationState,
} from "@/lib/storage/presentation-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { fetchPresentationAgendaRemote, upsertPresentationAgendaRemote } from "@/lib/supabase/agenda-db";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function PresentationPlanner() {
  const { locale, profile, authUserId } = useKampus();
  const es = locale === "es";

  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<PresentationState>(defaultPresentationState);
  const [rehearsalSeconds, setRehearsalSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [teleIndex, setTeleIndex] = useState(0);

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

  if (!hydrated) {
    return <div className="text-sm text-slate-400">{es ? "Cargando…" : "Loading…"}</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200/80">Collaboration</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {es ? "Planificador de exposición grupal" : "Group presentation planner"}
        </h1>
        <p className="mt-2 max-w-3xl text-base text-slate-300">
          {es
            ? "Roles, guiones, teleprompter, ensayo con cronómetro y banco de preguntas — pensado para equipos reales."
            : "Roles, scripts, teleprompter, timed rehearsal, and a question bank — built for real teams."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ShareLinkButton
            pathname="/collaborate/presentations"
            campaign="presentation_team"
            extra={{ deck: state.deckTitle }}
            refHandle={profile.university || "kampus"}
            label={es ? "Invitar al equipo" : "Invite team"}
            copiedLabel={es ? "Copiado" : "Copied"}
          />
        </div>
      </div>

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
              <CardDescription>{es ? "Quién dueña cada sección." : "Who owns each section."}</CardDescription>
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
            <CardDescription>{es ? "Asigna dueño y minutos — esto alimenta el teleprompter." : "Assign owner + minutes — feeds the teleprompter."}</CardDescription>
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
                  {es ? "Dueño" : "Owner"}
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
    </div>
  );
}
