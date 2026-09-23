"use client";

import { Bell, Loader2, Megaphone, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mailboxCopy } from "@/lib/i18n/mailbox";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  createAnnouncement,
  deleteAnnouncement,
  listMyAnnouncements,
  listMyTeachingSessions,
  type TeacherAnnouncement,
} from "@/lib/supabase/teacher-student-db";
import { cn } from "@/lib/cn";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none";
const areaClass = `${inputClass} min-h-28`;

type TeachingSession = { id: string; course: string; startsAt: string };

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TeacherNotices() {
  const t = mailboxCopy.es;
  const { authUserId, profile, hydrated } = useKampus();

  const [notices, setNotices] = useState<TeacherAnnouncement[]>([]);
  const [sessions, setSessions] = useState<TeachingSession[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [course, setCourse] = useState("");
  const [target, setTarget] = useState<"all" | "session">("all");
  const [sessionId, setSessionId] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!authUserId || !isSupabaseConfigured()) return;
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const [announcements, teachingSessions] = await Promise.all([
        listMyAnnouncements(supabase),
        listMyTeachingSessions(supabase, authUserId),
      ]);
      setNotices(announcements);
      setSessions(teachingSessions);
      if (teachingSessions.length > 0) setSessionId((s) => s || teachingSessions[0].id);
    } catch {
      setMessage({ ok: false, text: t.publishError });
    } finally {
      setLoading(false);
    }
  }, [authUserId, t]);

  useEffect(() => {
    if (hydrated) void load();
  }, [hydrated, load]);

  if (!hydrated) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  if (!authUserId || !isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Enseñanza" title={t.composeTitle} description={t.composeHint} />
        <Card>
          <CardHeader>
            <CardTitle>{t.loginNeeded}</CardTitle>
            <CardDescription>{t.composeHint}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  async function publish() {
    setMessage(null);
    if (!title.trim()) {
      setMessage({ ok: false, text: "Escribe un título para el aviso." });
      return;
    }
    if (!body.trim()) {
      setMessage({ ok: false, text: "Escribe el contenido del aviso." });
      return;
    }
    if (target === "session" && !sessionId) {
      setMessage({ ok: false, text: "Elige la clase a la que va dirigido." });
      return;
    }
    setPublishing(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const result = await createAnnouncement(supabase, {
        sessionId: target === "session" ? sessionId : null,
        course: course.trim(),
        title: title.trim(),
        body: body.trim(),
        teacherDisplayName: profile.displayName || "Profesor",
      });
      const newNotice: TeacherAnnouncement = {
        id: result.id,
        teacherUserId: authUserId ?? "",
        sessionId: target === "session" ? sessionId : null,
        course: course.trim(),
        title: title.trim(),
        body: body.trim(),
        teacherDisplayName: profile.displayName || "Profesor",
        createdAt: new Date().toISOString(),
      };
      setNotices((ns) => [newNotice, ...ns]);
      setTitle("");
      setBody("");
      setCourse("");
      setMessage({ ok: true, text: t.publishOk });
    } catch {
      setMessage({ ok: false, text: t.publishError });
    } finally {
      setPublishing(false);
    }
  }

  async function removeNotice(id: string) {
    // Confirmación en dos pasos (sin window.confirm: no funciona bien en
    // todos los navegadores y bloquea la prueba automatizada).
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setConfirmDeleteId(null);
    setDeletingId(id);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      await deleteAnnouncement(supabase, id);
      setNotices((ns) => ns.filter((n) => n.id !== id));
    } catch {
      setMessage({ ok: false, text: t.publishError });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Enseñanza" title={t.composeTitle} description={t.composeHint} />

      {message && (
        <p
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            message.ok
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
              : "border-rose-400/30 bg-rose-500/10 text-rose-200",
          )}
        >
          {message.text}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.composeTitle}</CardTitle>
          <CardDescription>{t.composeHint}</CardDescription>
        </CardHeader>
        <div className="space-y-4 px-6 pb-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Título *</label>
              <input
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Cambio de fecha del parcial"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                {t.formCourse ?? "Materia"}
              </label>
              <input
                className={inputClass}
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="Ej. Biología"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Contenido *</label>
            <textarea
              className={areaClass}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribe el aviso o pega el material para tus estudiantes…"
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-slate-400">¿Quién lo recibe?</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTarget("all")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  target === "all"
                    ? "bg-indigo-500/25 text-indigo-100 ring-1 ring-indigo-400/40"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                )}
              >
                {t.targetAll}
              </button>
              <button
                type="button"
                onClick={() => setTarget("session")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  target === "session"
                    ? "bg-indigo-500/25 text-indigo-100 ring-1 ring-indigo-400/40"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                )}
              >
                {t.targetSession}
              </button>
            </div>
            {target === "session" && (
              <div className="mt-3">
                {sessions.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Aún no creaste clases en el aula virtual. Publica a todos tus estudiantes mientras tanto.
                  </p>
                ) : (
                  <select
                    className={inputClass}
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id} className="bg-slate-950">
                        {s.course || "Clase"} · {formatDate(s.startsAt)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          <Button onClick={() => void publish()} disabled={publishing} className="gap-2">
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {t.publishCta}
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Megaphone className="h-5 w-5 text-indigo-300" />
          {t.myNoticesTitle}
        </h2>

        {loading ? (
          <Card>
            <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando avisos…
            </div>
          </Card>
        ) : notices.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <Bell className="h-8 w-8 text-slate-500" />
              <p className="text-sm text-slate-400">{t.emptyMyNotices}</p>
            </div>
          </Card>
        ) : (
          notices.map((notice) => {
            const session = notice.sessionId ? sessionById.get(notice.sessionId) : undefined;
            return (
              <Card key={notice.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{notice.title}</CardTitle>
                      <CardDescription>
                        {formatDate(notice.createdAt)}
                        {notice.course ? ` · ${notice.course}` : ""}
                      </CardDescription>
                    </div>
                    <Badge tone={notice.sessionId ? "accent" : "neutral"}>
                      {notice.sessionId ? (session?.course || "Una clase") : t.targetAll}
                    </Badge>
                  </div>
                </CardHeader>
                <div className="space-y-3 px-6 pb-6">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{notice.body}</p>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => void removeNotice(notice.id)}
                      disabled={deletingId === notice.id}
                      className="gap-2"
                    >
                      {deletingId === notice.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      {confirmDeleteId === notice.id ? "¿Confirmar?" : t.deleteCta}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
