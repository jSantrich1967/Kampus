"use client";

import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAgendaCloudError } from "@/lib/notebooks/storage-errors";
import type { StudentWork } from "@/lib/schemas/student-work";
import { addStudentWork, loadStudentWorks, removeStudentWork } from "@/lib/storage/student-work-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { deleteStudentWorkRemote, fetchStudentWorksRemote, insertStudentWorkRemote } from "@/lib/supabase/agenda-db";

/**
 * Mis investigaciones: mismos datos que en Mi calendario (trabajos / entregas), enfoque en lista y fechas.
 */
export function ResearchWorksHub() {
  const { profile, hydrated, authUserId } = useKampus();
  const useCloud = Boolean(isSupabaseConfigured() && authUserId);

  const [works, setWorks] = useState<StudentWork[]>([]);
  const [workTitle, setWorkTitle] = useState("");
  const [workSubject, setWorkSubject] = useState("");
  const [workDue, setWorkDue] = useState("");
  const [workNotes, setWorkNotes] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const loadWorks = useCallback(async () => {
    if (!hydrated) return;
    setLoading(true);
    setLoadError(null);
    try {
      if (useCloud) {
        const supabase = createSupabaseBrowserClient();
        const workList = await fetchStudentWorksRemote(supabase, authUserId!);
        setWorks(workList);
      } else {
        setWorks(loadStudentWorks());
      }
    } catch (e) {
      setLoadError(formatAgendaCloudError(e instanceof Error ? e.message : "No se pudo cargar."));
    } finally {
      setLoading(false);
    }
  }, [hydrated, useCloud, authUserId]);

  useEffect(() => {
    void loadWorks();
  }, [loadWorks, tick]);

  useEffect(() => {
    if (!hydrated) return;
    if (!workSubject.trim() && profile.subjects[0]) setWorkSubject(profile.subjects[0]!);
  }, [hydrated, profile.subjects, workSubject]);

  async function submitWork(e: FormEvent) {
    e.preventDefault();
    if (!workTitle.trim() || !workDue) return;
    const row = {
      title: workTitle.trim(),
      subject: workSubject.trim() || profile.subjects[0] || "General",
      dueDate: workDue,
      notes: workNotes.trim(),
    };
    try {
      if (useCloud) {
        const supabase = createSupabaseBrowserClient();
        await insertStudentWorkRemote(supabase, authUserId!, row);
      } else {
        addStudentWork(row);
      }
      setWorkTitle("");
      setWorkDue("");
      setWorkNotes("");
      refresh();
    } catch (err) {
      setLoadError(formatAgendaCloudError(err instanceof Error ? err.message : "Error al guardar."));
    }
  }

  async function removeWork(id: string) {
    try {
      if (useCloud) {
        const supabase = createSupabaseBrowserClient();
        await deleteStudentWorkRemote(supabase, authUserId!, id);
      } else {
        removeStudentWork(id);
      }
      refresh();
    } catch (err) {
      setLoadError(formatAgendaCloudError(err instanceof Error ? err.message : "Error al eliminar."));
    }
  }

  if (!hydrated) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  const workStorageHint = useCloud
    ? "Se guardan en tu cuenta (Supabase) y aparecen también en Evaluación → Mi calendario."
    : "Quedan en este dispositivo. Con sesión y Supabase, se sincronizan en la nube.";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Colaboración"
        title="Mis investigaciones"
        description="Registra trabajos, monografías y entregas con fecha límite. Los mismos datos se reflejan en tu calendario académico."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/exams/calendar">
              <Button variant="secondary" size="sm">
                Mi calendario
              </Button>
            </Link>
            <Link href="/collaborate/exposiciones">
              <Button variant="ghost" size="sm">
                Mis exposiciones
              </Button>
            </Link>
          </div>
        }
      />

      {loadError ? <p className="text-sm text-rose-300">{loadError}</p> : null}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Sincronizando…
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Trabajos y entregas</CardTitle>
          <CardDescription>{workStorageHint}</CardDescription>
        </CardHeader>
        <form className="space-y-3 px-6 pb-4" onSubmit={(e) => void submitWork(e)}>
          <label className="block space-y-1 text-xs">
            <span className="text-slate-500">Título</span>
            <input
              required
              className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm outline-none ring-indigo-400/30 focus:ring"
              value={workTitle}
              onChange={(e) => setWorkTitle(e.target.value)}
              placeholder="Ej. Monografía unidad 3"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs">
              <span className="text-slate-500">Materia</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm outline-none ring-indigo-400/30 focus:ring"
                value={workSubject}
                onChange={(e) => setWorkSubject(e.target.value)}
                placeholder="Ej. Historia"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-slate-500">Fecha límite</span>
              <input
                required
                type="date"
                className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm text-slate-200 outline-none ring-indigo-400/30 focus:ring"
                value={workDue}
                onChange={(e) => setWorkDue(e.target.value)}
              />
            </label>
          </div>
          <label className="block space-y-1 text-xs">
            <span className="text-slate-500">Notas (opcional)</span>
            <input
              className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-2 text-sm outline-none ring-indigo-400/30 focus:ring"
              value={workNotes}
              onChange={(e) => setWorkNotes(e.target.value)}
              placeholder="Enlace al enunciado, bibliografía…"
            />
          </label>
          <Button type="submit" size="sm">
            Añadir trabajo
          </Button>
        </form>
        <ul className="space-y-2 border-t border-white/10 px-6 py-4">
          {works.length === 0 ? (
            <li className="text-sm text-slate-500">Aún no hay trabajos registrados.</li>
          ) : (
            works.map((w) => (
              <li
                key={w.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-100">{w.title}</div>
                  <div className="text-xs text-slate-500">
                    {w.dueDate} · {w.subject}
                  </div>
                  {w.notes ? <div className="mt-1 text-xs text-slate-400">{w.notes}</div> : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-rose-300 hover:text-rose-200"
                  aria-label="Eliminar trabajo"
                  onClick={() => void removeWork(w.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}
