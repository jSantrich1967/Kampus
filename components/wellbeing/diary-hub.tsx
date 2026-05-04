"use client";

import {
  BookMarked,
  Calendar,
  Check,
  Copy,
  Flame,
  Heart,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
  SunMedium,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { localIsoDate } from "@/lib/calendar/local-iso-date";
import { cn } from "@/lib/cn";
import { formatAgendaCloudError } from "@/lib/notebooks/storage-errors";
import type { DiaryEntry, DiaryMoment, DiaryMood } from "@/lib/schemas/diary-entry";
import {
  createDiaryEntry,
  deleteDiaryEntry,
  diaryStreakDays,
  loadDiaryEntries,
  upsertDiaryEntry,
} from "@/lib/storage/diary-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { deleteDiaryEntryRemote, fetchDiaryEntriesRemote, insertDiaryEntryRemote, updateDiaryEntryRemote } from "@/lib/supabase/diary-db";

const MOODS: { id: DiaryMood; label: string; emoji: string }[] = [
  { id: "heavy", label: "Muy bajo", emoji: "🌧️" },
  { id: "low", label: "Bajo", emoji: "☁️" },
  { id: "neutral", label: "Regular", emoji: "⛅" },
  { id: "light", label: "Bien", emoji: "🌤️" },
  { id: "bright", label: "Muy bien", emoji: "☀️" },
];

const MOMENTS: { id: DiaryMoment; label: string }[] = [
  { id: "morning", label: "Mañana" },
  { id: "afternoon", label: "Tarde" },
  { id: "evening", label: "Atardecer" },
  { id: "night", label: "Noche" },
];

const TAG_PRESETS = ["Estudios", "Familia", "Amigos", "Salud", "Sueño", "Estrés", "Metas", "Ocio", "Trabajo"];

const PROMPTS = [
  "¿Qué parte del día fue la más intensa y por qué?",
  "¿Qué te gustaría que tu ‘yo del futuro’ recordara de hoy?",
  "Algo que te costó y cómo lo afrontaste (aunque no haya salido perfecto).",
  "Un micro-momento agradable que quizá nadie más notó.",
  "¿Qué necesitas mañana de ti mismo/a: descanso, foco, valentía, paciencia…?",
  "Si hoy fuera un capítulo de un libro, ¿cómo lo titularías?",
  "¿Qué conversación o pensamiento te ha dado vueltas?",
  "Una cosa que aprendiste hoy (aunque sea pequeña).",
  "¿Dónde sentiste orgullo o alivio, por pequeño que fuera?",
  "¿Qué te dirías con el cariño que le tendrías a un buen amigo?",
];

const FLOW_STEPS = [
  { title: "Check-in emocional", body: "Nombrar el estado sin juzgarte ya ordena un poco la mente." },
  { title: "Energía", body: "No es rendimiento: es cómo te sentías con tus pilas hoy." },
  { title: "Gratitud breve", body: "Tres líneas máximo; basta con lo mínimo (un café, un mensaje, un silencio bueno)." },
  { title: "Reflexión", body: "Aquí va lo importante: narrativa libre con una pregunta guía que cambia cada día." },
  { title: "Intención", body: "Una frase hacia mañana: dirección, no presión." },
  { title: "Cierre", body: "Etiquetas opcionales y guardar. Releer días difíciles también cuenta como autocuidado." },
];

function promptForDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = y! * 372 + m! * 31 + d!;
  return PROMPTS[Math.abs(t) % PROMPTS.length]!;
}

function formatLongDateEs(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  return dt.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function entryToPlainText(e: DiaryEntry): string {
  const lines = [
    `Diario · ${e.entryDate}`,
    `Ánimo: ${e.mood} · Energía: ${e.energy}/5`,
    e.moment ? `Momento: ${e.moment}` : null,
    "",
    "--- Gratitud ---",
    ...e.gratitude.filter(Boolean).map((g, i) => `${i + 1}. ${g}`),
    "",
    "--- Reflexión ---",
    e.body.trim() || "(vacío)",
    "",
    "--- Intención ---",
    e.intention.trim() || "(vacío)",
    "",
    e.tags.length ? `Etiquetas: ${e.tags.join(", ")}` : null,
  ].filter(Boolean) as string[];
  return lines.join("\n");
}

export function DiaryHub() {
  const { hydrated: kampusHydrated, authUserId } = useKampus();
  const useCloud = Boolean(isSupabaseConfigured() && authUserId);

  const [hydrated, setHydrated] = useState(false);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  const [entryDate, setEntryDate] = useState("");
  const [mood, setMood] = useState<DiaryMood>("neutral");
  const [energy, setEnergy] = useState(3);
  const [moment, setMoment] = useState<DiaryMoment | "">("");
  const [g1, setG1] = useState("");
  const [g2, setG2] = useState("");
  const [g3, setG3] = useState("");
  const [body, setBody] = useState("");
  const [intention, setIntention] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [draftBanner, setDraftBanner] = useState<string | null>(null);
  const [draftKey, setDraftKey] = useState(0);
  const formAnchorRef = useRef<HTMLDivElement | null>(null);

  const loadEntries = useCallback(async () => {
    if (!hydrated || !kampusHydrated) return;
    setLoading(true);
    setLoadError(null);
    try {
      if (useCloud) {
        const supabase = createSupabaseBrowserClient();
        const list = await fetchDiaryEntriesRemote(supabase, authUserId!);
        setEntries(list);
      } else {
        setEntries(loadDiaryEntries());
      }
    } catch (e) {
      setLoadError(formatAgendaCloudError(e instanceof Error ? e.message : "No se pudo cargar el diario."));
    } finally {
      setLoading(false);
    }
  }, [hydrated, kampusHydrated, useCloud, authUserId]);

  useEffect(() => {
    setHydrated(true);
    setEntryDate(localIsoDate());
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries, tick]);

  const streak = useMemo(() => diaryStreakDays(entries), [entries]);
  const dailyPrompt = useMemo(() => (entryDate ? promptForDate(entryDate) : PROMPTS[0]!), [entryDate]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => b.entryDate.localeCompare(a.entryDate) || b.createdAt.localeCompare(a.createdAt));
  }, [entries]);

  const entriesThisMonth = useMemo(() => {
    const prefix = localIsoDate().slice(0, 7);
    return entries.filter((e) => e.entryDate.startsWith(prefix)).length;
  }, [entries]);

  function resetForm() {
    setEditingId(null);
    setEntryDate(localIsoDate());
    setMood("neutral");
    setEnergy(3);
    setMoment("");
    setG1("");
    setG2("");
    setG3("");
    setBody("");
    setIntention("");
    setTags([]);
    setFormError(null);
  }

  /** Reinicia el borrador, hace scroll al formulario y muestra feedback (el botón hace algo aunque ya estuviera vacío). */
  const startNewEntry = useCallback(() => {
    resetForm();
    setDraftKey((k) => k + 1);
    setDraftBanner("Borrador nuevo: campos vacíos. Si no ves el formulario, baja un poco en la página.");
    window.setTimeout(() => setDraftBanner(null), 6000);
    requestAnimationFrame(() => {
      formAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  function loadEntryForEdit(e: DiaryEntry) {
    setEditingId(e.id);
    setEntryDate(e.entryDate);
    setMood(e.mood);
    setEnergy(e.energy);
    setMoment(e.moment ?? "");
    const [a, b, c] = [...e.gratitude, "", "", ""].slice(0, 3);
    setG1(a ?? "");
    setG2(b ?? "");
    setG3(c ?? "");
    setBody(e.body);
    setIntention(e.intention);
    setTags([...e.tags]);
    setFormError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleTag(t: string) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function submitEntry() {
    setFormError(null);
    const gratitude = [g1, g2, g3].map((s) => s.trim()).filter(Boolean);
    const bodyTrim = body.trim();
    if (bodyTrim.length < 12 && gratitude.length === 0) {
      setFormError("Escribe al menos unas líneas en la reflexión, o algo en gratitud (aunque sea una frase).");
      return;
    }

    const payload = {
      entryDate,
      mood,
      energy,
      moment: moment || undefined,
      gratitude,
      body: bodyTrim,
      intention: intention.trim(),
      tags,
    };

    try {
      if (useCloud) {
        const supabase = createSupabaseBrowserClient();
        if (editingId) {
          const prev = entries.find((e) => e.id === editingId);
          if (!prev) return;
          await updateDiaryEntryRemote(supabase, authUserId!, {
            ...prev,
            ...payload,
            id: editingId,
            createdAt: prev.createdAt,
          });
        } else {
          await insertDiaryEntryRemote(supabase, authUserId!, payload);
        }
      } else if (editingId) {
        const prev = entries.find((e) => e.id === editingId);
        if (!prev) return;
        upsertDiaryEntry({
          ...prev,
          ...payload,
          id: editingId,
          createdAt: prev.createdAt,
        });
      } else {
        createDiaryEntry(payload);
      }
      bump();
      resetForm();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2400);
    } catch (e) {
      setFormError(formatAgendaCloudError(e instanceof Error ? e.message : "No se pudo guardar."));
    }
  }

  async function copyEntry(e: DiaryEntry) {
    try {
      await navigator.clipboard.writeText(entryToPlainText(e));
    } catch {
      /* ignore */
    }
  }

  async function removeEntry(id: string) {
    const where = useCloud ? "tu cuenta (Supabase)" : "este dispositivo";
    if (!window.confirm(`¿Borrar esta entrada del diario en ${where}?`)) return;
    try {
      if (useCloud) {
        const supabase = createSupabaseBrowserClient();
        await deleteDiaryEntryRemote(supabase, authUserId!, id);
      } else {
        deleteDiaryEntry(id);
      }
      bump();
      if (editingId === id) resetForm();
    } catch (e) {
      setLoadError(formatAgendaCloudError(e instanceof Error ? e.message : "No se pudo borrar."));
    }
  }

  if (!hydrated || !kampusHydrated) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Bienestar"
        title="Mi Diario"
        description="Un ritual privado para ordenar el día: ánimo, gratitud breve, reflexión con pregunta guía e intención para mañana. Pensado como un diario de cabecera, no como una red social."
        actions={
          <div className="relative z-20 flex flex-col items-end gap-1">
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  startNewEntry();
                }}
              >
                Entrada nueva
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => bump()} disabled={loading}>
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                Actualizar
              </Button>
            </div>
            <span className="max-w-[14rem] text-right text-[10px] text-slate-500 md:max-w-xs">
              Vacía el borrador y te lleva al bloque del formulario abajo.
            </span>
          </div>
        }
      />

      {draftBanner ? (
        <p className="rounded-xl border border-indigo-400/30 bg-indigo-950/40 px-4 py-3 text-sm text-indigo-100">{draftBanner}</p>
      ) : null}

      {loadError ? <p className="text-sm text-rose-300">{loadError}</p> : null}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Sincronizando diario…
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 text-sm">
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-2 text-amber-100">
          <Flame className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            Racha: <strong className="text-white">{streak}</strong> día{streak === 1 ? "" : "s"} seguidos
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-slate-300">
          <Calendar className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <span>
            Este mes: <strong className="text-white">{entriesThisMonth}</strong> entrada{entriesThisMonth === 1 ? "" : "s"}
          </span>
        </div>
        {savedFlash ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-2 text-emerald-100">
            <Check className="h-4 w-4" aria-hidden />
            {useCloud ? "Guardado en tu cuenta" : "Guardado en este dispositivo"}
          </div>
        ) : null}
      </div>

      <Card className="border-indigo-500/20 bg-indigo-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-100">
            <BookMarked className="h-4 w-4" aria-hidden />
            Privacidad
          </CardTitle>
          <CardDescription className="text-indigo-100/85">
            {useCloud ? (
              <>
                Con sesión, las entradas se guardan en <strong className="text-white">Supabase</strong> asociadas a tu usuario (RLS:
                solo tú). No es cifrado extremo-a-extremo: el contenido viaja cifrado en HTTPS y se almacena en JSON en la base del
                proyecto. Sigue siendo buena idea no escribir datos que no quieras que el proveedor pueda ver según su política. Usa
                «Copiar» para un respaldo tuyo.
              </>
            ) : (
              <>
                Sin sesión (o sin Supabase), las entradas quedan solo en <strong className="text-white">este navegador</strong>{" "}
                (localStorage). Si borras datos del sitio o cambias de dispositivo, puedes perder el historial: usa «Copiar» en
                entradas importantes. Al iniciar sesión con la migración aplicada, el diario pasa a la nube (las entradas viejas locales
                no se fusionan solas).
              </>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-200/90" aria-hidden />
            Flujo de un buen diario personal
          </CardTitle>
          <CardDescription className="text-slate-300">
            Inspirado en diarios guiados y prácticas de atención plena: corto si vas con prisa, más profundo si te quedas.
          </CardDescription>
        </CardHeader>
        <ol className="list-none space-y-2 px-5 pb-5">
          {FLOW_STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-xl border border-white/5 bg-slate-950/30 px-3 py-2 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
                {i + 1}
              </span>
              <div>
                <div className="font-medium text-slate-100">{s.title}</div>
                <p className="text-slate-400">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
        <div ref={formAnchorRef} className="scroll-mt-24">
          <Card className="p-0">
            <CardHeader className="flex flex-col gap-3 border-b border-white/5 px-5 pb-4 pt-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle>{editingId ? "Editar entrada" : "Escribir en el diario"}</CardTitle>
                <CardDescription>
                  Fecha del día que quieres registrar. Puedes escribir “para ayer” si te encaja más el ritual nocturno.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0"
                onClick={(e) => {
                  e.preventDefault();
                  startNewEntry();
                }}
              >
                Limpiar borrador
              </Button>
            </CardHeader>
            <div key={draftKey} className="space-y-6 px-5 py-5">
            <label className="block space-y-1 text-xs">
              <span className="text-slate-500">Día de la entrada</span>
              <input
                type="date"
                className="w-full max-w-xs rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm text-slate-200 outline-none ring-indigo-400/30 focus:ring"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </label>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-white">1. ¿Cómo te sentías hoy?</h3>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMood(m.id)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left text-sm transition",
                      mood === m.id
                        ? "border-indigo-400/60 bg-indigo-500/20 text-white ring-1 ring-indigo-400/40"
                        : "border-white/10 bg-slate-950/40 text-slate-300 hover:border-white/20",
                    )}
                  >
                    <span className="mr-1.5" aria-hidden>
                      {m.emoji}
                    </span>
                    {m.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-white">2. Energía (1 = agotado/a · 5 = con fuelle)</h3>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEnergy(n)}
                    className={cn(
                      "h-10 w-10 rounded-full border text-sm font-semibold transition",
                      energy === n
                        ? "border-cyan-400/60 bg-cyan-500/20 text-white"
                        : "border-white/10 bg-slate-950/50 text-slate-400 hover:border-white/25",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <SunMedium className="h-4 w-4 text-amber-200/80" aria-hidden />
                3. Momento del día (opcional)
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMoment("")}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs",
                    moment === "" ? "border-white/30 bg-white/10 text-white" : "border-white/10 text-slate-400 hover:bg-white/5",
                  )}
                >
                  Sin especificar
                </button>
                {MOMENTS.map((mo) => (
                  <button
                    key={mo.id}
                    type="button"
                    onClick={() => setMoment(mo.id)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs",
                      moment === mo.id
                        ? "border-amber-400/50 bg-amber-500/15 text-amber-50"
                        : "border-white/10 text-slate-400 hover:bg-white/5",
                    )}
                  >
                    {mo.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Heart className="h-4 w-4 text-rose-300/90" aria-hidden />
                4. Gratitud (opcional, hasta 3 líneas)
              </h3>
              <div className="space-y-2">
                <input
                  className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm outline-none ring-indigo-400/30 focus:ring"
                  placeholder="Algo pequeño…"
                  value={g1}
                  onChange={(e) => setG1(e.target.value)}
                />
                <input
                  className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm outline-none ring-indigo-400/30 focus:ring"
                  placeholder="Otro detalle…"
                  value={g2}
                  onChange={(e) => setG2(e.target.value)}
                />
                <input
                  className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm outline-none ring-indigo-400/30 focus:ring"
                  placeholder="Uno más si te apetece…"
                  value={g3}
                  onChange={(e) => setG3(e.target.value)}
                />
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-white">5. Reflexión del día</h3>
              <p className="rounded-lg border border-indigo-500/20 bg-indigo-950/20 px-3 py-2 text-xs italic text-indigo-100/95">
                Pregunta guía: {dailyPrompt}
              </p>
              <textarea
                className="min-h-[160px] w-full resize-y rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm leading-relaxed text-slate-100 outline-none ring-indigo-400/30 focus:ring"
                placeholder="Escribe con libertad. No hace falta bonito: hace falta honesto."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-white">6. Intención para el próximo día (una frase)</h3>
              <input
                className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm outline-none ring-indigo-400/30 focus:ring"
                placeholder="Ej. Mañana me levanto sin mirar el móvil los primeros 15 minutos."
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
              />
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-white">7. Etiquetas (opcional)</h3>
              <div className="flex flex-wrap gap-2">
                {TAG_PRESETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition",
                      tags.includes(t)
                        ? "border-indigo-400/50 bg-indigo-500/20 text-indigo-50"
                        : "border-white/10 text-slate-400 hover:border-white/20",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </section>

            {formError ? <p className="text-sm text-rose-300">{formError}</p> : null}

            <div className="flex flex-wrap gap-2 border-t border-white/5 pt-4">
              <Button type="button" onClick={() => void submitEntry()}>
                {editingId ? "Guardar cambios" : "Guardar entrada"}
              </Button>
              {editingId ? (
                <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                  Cancelar edición
                </Button>
              ) : null}
            </div>
          </div>
          </Card>
        </div>

        <Card className="p-0">
          <CardHeader className="border-b border-white/5 px-5 pb-4 pt-5">
            <CardTitle>Historial</CardTitle>
            <CardDescription>
              Las más recientes arriba. Copia lo que quieras conservar por tu cuenta.{" "}
              {useCloud ? "Los cambios se sincronizan con tu cuenta." : null}
            </CardDescription>
          </CardHeader>
          <ul className="max-h-[min(560px,65vh)] divide-y divide-white/5 overflow-y-auto">
            {sortedEntries.length === 0 ? (
              <li className="px-5 py-10 text-center text-sm text-slate-500">
                Aún no hay entradas. El primer día puede ser una sola frase: ya es suficiente.
              </li>
            ) : (
              sortedEntries.map((e) => (
                <li key={e.id} className="px-5 py-4 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium capitalize text-slate-100">{formatLongDateEs(e.entryDate)}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {MOODS.find((m) => m.id === e.mood)?.emoji} {MOODS.find((m) => m.id === e.mood)?.label} · Energía{" "}
                        {e.energy}/5
                        {e.tags.length ? ` · ${e.tags.join(", ")}` : null}
                      </div>
                      {e.body.trim() ? (
                        <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-slate-300">{e.body.trim()}</p>
                      ) : e.gratitude.length ? (
                        <p className="mt-2 text-slate-400">Gratitud: {e.gratitude.join(" · ")}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Button type="button" size="sm" variant="ghost" className="h-8 px-2" title="Copiar" onClick={() => void copyEntry(e)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="h-8 px-2" title="Editar" onClick={() => loadEntryForEdit(e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-rose-300 hover:text-rose-200"
                        title="Borrar"
                        onClick={() => void removeEntry(e.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
