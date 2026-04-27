"use client";

import { Bookmark, Flame, MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatBlock } from "@/components/ui/stat-block";
import {
  buildChannels,
  buildClassAlerts,
  buildCommonQuestions,
  buildTopNotes,
  buildPeerExplanations,
  buildTrendingThreads,
  resolveChannelNavigation,
  type CommunityContext,
} from "@/lib/community-mock";
import { loadSavedNoteIds, saveSavedNoteIds } from "@/lib/storage/community-saved-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/cn";

const contexts: { id: CommunityContext; es: string; en: string }[] = [
  { id: "subject", es: "Materia", en: "Subject" },
  { id: "exam", es: "Examen", en: "Exam" },
  { id: "professor", es: "Profesor", en: "Professor" },
  { id: "semester", es: "Semestre", en: "Semester" },
  { id: "topic", es: "Tema", en: "Topic" },
  { id: "university", es: "Universidad", en: "University" },
];

function heatLabel(heat: "quiet" | "active" | "hot", es: boolean) {
  if (heat === "hot") return es ? "Caliente" : "Hot";
  if (heat === "active") return es ? "Activo" : "Active";
  return es ? "Tranquilo" : "Quiet";
}

function heatTone(heat: "quiet" | "active" | "hot") {
  if (heat === "hot") return "danger" as const;
  if (heat === "active") return "warning" as const;
  return "neutral" as const;
}

export function CommunityHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, locale, authUserId } = useKampus();
  const es = locale === "es";

  const [context, setContext] = useState<CommunityContext>("subject");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  const [postBody, setPostBody] = useState("");
  const [postBusy, setPostBusy] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [posts, setPosts] = useState<
    { id: string; channel_id: string; body: string; created_at: string; user_id: string }[]
  >([]);

  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [answerBusyId, setAnswerBusyId] = useState<string | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [answersByQuestion, setAnswersByQuestion] = useState<
    Record<string, { id: string; question_id: string; body: string; created_at: string; user_id: string }[]>
  >({});

  useEffect(() => {
    setSavedIds(loadSavedNoteIds());
  }, []);

  useEffect(() => {
    const raw = searchParams.get("channel");
    if (!raw) return;
    let id = raw;
    try {
      id = decodeURIComponent(raw);
    } catch {
      id = raw;
    }
    const nav = resolveChannelNavigation(profile, id);
    if (nav) {
      setContext(nav.context);
      setSelectedChannelId(id);
    }
  }, [searchParams, profile]);

  const channels = useMemo(() => buildChannels(profile, context, locale), [profile, context, locale]);
  const notes = useMemo(() => buildTopNotes(profile, locale), [profile, locale]);
  const questions = useMemo(() => buildCommonQuestions(profile, locale), [profile, locale]);
  const threads = useMemo(() => buildTrendingThreads(profile, locale), [profile, locale]);
  const peers = useMemo(() => buildPeerExplanations(profile, locale), [profile, locale]);
  const alerts = useMemo(() => buildClassAlerts(profile, locale), [profile, locale]);

  useEffect(() => {
    if (!selectedChannelId) return;
    if (!channels.some((c) => c.id === selectedChannelId)) {
      setSelectedChannelId(null);
    }
  }, [channels, selectedChannelId]);

  // Default channel: first recommended channel in current context.
  useEffect(() => {
    if (selectedChannelId) return;
    if (channels.length === 0) return;
    setSelectedChannelId(channels[0]!.id);
  }, [channels, selectedChannelId]);

  useEffect(() => {
    if (!authUserId || !isSupabaseConfigured()) {
      setPosts([]);
      setAnswersByQuestion({});
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();

        const { data: pData, error: pErr } = await supabase
          .from("community_posts")
          .select("id,channel_id,body,created_at,user_id")
          .order("created_at", { ascending: false })
          .limit(50);
        if (pErr) throw pErr;

        const { data: aData, error: aErr } = await supabase
          .from("community_question_answers")
          .select("id,question_id,body,created_at,user_id")
          .order("created_at", { ascending: false })
          .limit(80);
        if (aErr) throw aErr;

        if (cancelled) return;
        setPosts((pData as typeof posts) ?? []);
        const grouped: typeof answersByQuestion = {};
        ((aData as { id: string; question_id: string; body: string; created_at: string; user_id: string }[]) ?? []).forEach(
          (row) => {
            if (!grouped[row.question_id]) grouped[row.question_id] = [];
            grouped[row.question_id]!.push(row);
          },
        );
        setAnswersByQuestion(grouped);
      } catch (e) {
        console.error("[CommunityHub] load community content", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  async function submitPost() {
    if (!authUserId) return;
    if (!isSupabaseConfigured()) return;
    const body = postBody.trim();
    if (!body) return;
    if (!selectedChannelId) {
      setPostError(es ? "Elige un canal." : "Select a channel.");
      return;
    }
    setPostBusy(true);
    setPostError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("community_posts")
        .insert({ user_id: authUserId, channel_id: selectedChannelId, body })
        .select("id,channel_id,body,created_at,user_id")
        .single();
      if (error) throw error;
      setPosts((prev) => [data as (typeof posts)[number], ...prev]);
      setPostBody("");
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : null;
      setPostError(msg || (es ? "No se pudo publicar." : "Could not post."));
    } finally {
      setPostBusy(false);
    }
  }

  async function submitAnswer(questionId: string) {
    if (!authUserId) return;
    if (!isSupabaseConfigured()) return;
    const body = (answerDrafts[questionId] ?? "").trim();
    if (!body) return;
    setAnswerBusyId(questionId);
    setAnswerError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("community_question_answers")
        .insert({ user_id: authUserId, question_id: questionId, body })
        .select("id,question_id,body,created_at,user_id")
        .single();
      if (error) throw error;
      setAnswersByQuestion((prev) => ({
        ...prev,
        [questionId]: [data as (typeof answersByQuestion)[string][number], ...(prev[questionId] ?? [])],
      }));
      setAnswerDrafts((prev) => ({ ...prev, [questionId]: "" }));
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : null;
      setAnswerError(msg || (es ? "No se pudo responder." : "Could not answer."));
    } finally {
      setAnswerBusyId(null);
    }
  }

  function clearChannelLink() {
    setSelectedChannelId(null);
    router.replace("/community");
  }

  function toggleSave(id: string) {
    setSavedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveSavedNoteIds(next);
      return next;
    });
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={es ? "Juntos" : "Together"}
        title={es ? "Comunidades con contexto académico" : "Context-native communities"}
        description={
          es
            ? "No es un feed genérico: entras por materia, examen, profesor, semestre, tema o universidad — y ves lo que importa para aprobar."
            : "Not a generic feed: enter by subject, exam, professor, semester, topic, or university — and see what helps you pass."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <ShareLinkButton
              pathname="/community"
              campaign="community_invite"
              extra={{ channel: selectedChannelId ?? undefined }}
              refHandle={profile.university || "kampus"}
              label={es ? "Invitar a comunidad" : "Invite to community"}
              copiedLabel={es ? "Copiado" : "Copied"}
            />
            <ShareLinkButton
              pathname="/study/library/rescue"
              campaign="rescue_pack"
              refHandle={profile.university || "kampus"}
              label={es ? "Compartir kit de estudios" : "Share study kit"}
              copiedLabel={es ? "Copiado" : "Copied"}
            />
          </div>
        }
      />

      {selectedChannelId ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-100">
            <span className="font-semibold text-white">{es ? "Canal enlazado" : "Linked channel"}: </span>
            {channels.find((c) => c.id === selectedChannelId)?.title ?? selectedChannelId}
            <span className="mt-1 block text-xs text-slate-300">
              {es ? "Pulsa un canal para cambiar el enlace que copias." : "Select a channel to change the link you copy."}
            </span>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={clearChannelLink}>
            {es ? "Quitar enlace" : "Clear link"}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {contexts.map((c) => (
          <Button
            key={c.id}
            type="button"
            size="sm"
            variant={context === c.id ? "secondary" : "ghost"}
            onClick={() => {
              setContext(c.id);
            }}
          >
            {es ? c.es : c.en}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatBlock
          label={es ? "Canales en este contexto" : "Channels in this context"}
          value={channels.length}
          hint={es ? "Cada canal acelera señal y reduce ruido." : "Each channel increases signal and cuts noise."}
        />
        <StatBlock
          label={es ? "Notas guardadas" : "Saved notes"}
          value={savedIds.length}
          hint={es ? "Persistencia local (demo)." : "Local persistence (demo)."}
        />
        <StatBlock
          label={es ? "Universidad" : "University"}
          value={profile.university || "—"}
          hint={profile.semester}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-200" />
            {es ? "Canales recomendados" : "Recommended channels"}
          </CardTitle>
          <CardDescription>
            {es
              ? "Entrada social al estudio: pregunta común → explicación corta → práctica."
              : "Social entry to studying: common question → short explanation → practice."}
          </CardDescription>
        </CardHeader>
        <div className="grid gap-3 md:grid-cols-2">
          {channels.length === 0 ? (
            <p className="text-sm text-slate-400">
              {es ? "Agrega materias o exámenes en onboarding para poblar canales." : "Add subjects or exams in onboarding to populate channels."}
            </p>
          ) : (
            channels.map((ch) => (
              <div
                key={ch.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedChannelId(ch.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedChannelId(ch.id);
                  }
                }}
                className={cn(
                  "cursor-pointer rounded-2xl border bg-slate-950/40 p-4 text-left transition hover:bg-slate-900/60",
                  ch.id === selectedChannelId
                    ? "border-indigo-400/50 ring-2 ring-indigo-400/30"
                    : "border-white/10 hover:border-white/20",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-white">{ch.title}</div>
                    <div className="mt-1 text-sm text-slate-400">{ch.subtitle}</div>
                  </div>
                  <Badge tone={heatTone(ch.heat)}>{heatLabel(ch.heat, es)}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> ~{ch.membersApprox}
                  </span>
                  <Link
                    href="/collaborate/rooms"
                    className="text-indigo-200 hover:text-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {es ? "Formar grupo de estudio →" : "Start study group →"}
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="border-indigo-400/25 bg-indigo-500/[0.06]">
        <CardHeader>
          <CardTitle>{es ? "Publicar en comunidad" : "Post to community"}</CardTitle>
          <CardDescription>
            {es
              ? "Escribe un post corto en el canal seleccionado. Requiere iniciar sesión."
              : "Write a short post in the selected channel. Requires login."}
          </CardDescription>
        </CardHeader>
        <div className="space-y-3 px-6 pb-6">
          {!authUserId ? (
            <p className="text-sm text-slate-400">{es ? "Inicia sesión para publicar." : "Sign in to post."}</p>
          ) : !isSupabaseConfigured() ? (
            <p className="text-sm text-slate-400">{es ? "Configura Supabase para publicar." : "Configure Supabase to post."}</p>
          ) : (
            <>
              <div className="text-xs text-slate-500">
                {es ? "Canal:" : "Channel:"}{" "}
                <span className="text-slate-200">{selectedChannelId ?? (es ? "—" : "—")}</span>
              </div>
              <textarea
                className="min-h-[90px] w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none ring-indigo-400/40 focus:ring"
                placeholder={es ? "Escribe tu comentario (máx. 1200 caracteres)…" : "Write your post (max 1200 chars)…"}
                value={postBody}
                onChange={(e) => setPostBody(e.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" className="gap-2" disabled={postBusy || !postBody.trim()} onClick={() => void submitPost()}>
                  {postBusy ? (es ? "Publicando…" : "Posting…") : es ? "Publicar" : "Post"}
                </Button>
                <Button type="button" size="sm" variant="ghost" disabled={postBusy} onClick={() => setPostBody("")}>
                  {es ? "Limpiar" : "Clear"}
                </Button>
                {postError ? <span className="text-xs text-rose-300">{postError}</span> : null}
              </div>
            </>
          )}
        </div>
      </Card>

      {authUserId && isSupabaseConfigured() && selectedChannelId ? (
        <Card>
          <CardHeader>
            <CardTitle>{es ? "Posts recientes del canal" : "Recent channel posts"}</CardTitle>
            <CardDescription>
              {es ? "Lo último publicado en este canal (demo MVP)." : "Latest posts in this channel (MVP demo)."}
            </CardDescription>
          </CardHeader>
          <div className="space-y-3 px-6 pb-6">
            {posts.filter((p) => p.channel_id === selectedChannelId).length === 0 ? (
              <p className="text-sm text-slate-400">{es ? "Aún no hay posts. Sé el primero." : "No posts yet. Be the first."}</p>
            ) : (
              posts
                .filter((p) => p.channel_id === selectedChannelId)
                .slice(0, 12)
                .map((p) => (
                  <div key={p.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="text-[11px] text-slate-500">
                      {es ? "Publicado" : "Posted"}{" "}
                      <span suppressHydrationWarning>
                        {new Date(p.created_at).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-100">{p.body}</p>
                  </div>
                ))
            )}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{es ? "Explicaciones entre pares" : "Peer explanations"}</CardTitle>
          <CardDescription>{es ? "Cortas, accionables, con voto de utilidad." : "Short, actionable, usefulness-voted."}</CardDescription>
        </CardHeader>
        <div className="grid gap-3 md:grid-cols-3">
          {peers.map((p) => (
            <div key={p.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="text-xs text-slate-400">
                {p.author} · <span className="text-indigo-200">{p.subject}</span>
              </div>
              <p className="mt-2 text-sm text-slate-100">{p.snippet}</p>
              <div className="mt-3 text-xs text-slate-500">{p.helpfulVotes} {es ? "útil" : "helpful"}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-cyan-200" />
              {es ? "Top notas (ranking)" : "Top notes (ranked)"}
            </CardTitle>
            <CardDescription>{es ? "Utilidad + cercanía a examen + tiempo." : "Usefulness + exam proximity + time."}</CardDescription>
          </CardHeader>
          <div className="space-y-4">
            {notes.length === 0 ? (
              <p className="text-sm text-slate-400">
                {es ? "Agrega materias para ver notas rankeadas." : "Add subjects to see ranked notes."}
              </p>
            ) : null}
            {notes.map((n) => (
              <div key={n.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-white">{n.title}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {n.subject} · {n.minutesToConsume} min
                    </div>
                  </div>
                  <Button type="button" size="sm" variant={savedIds.includes(n.id) ? "secondary" : "ghost"} onClick={() => toggleSave(n.id)}>
                    {savedIds.includes(n.id) ? (es ? "Guardado" : "Saved") : es ? "Guardar" : "Save"}
                  </Button>
                </div>
                <p className="mt-2 text-sm text-slate-300">{n.excerpt}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">{es ? "Utilidad" : "Usefulness"}</div>
                    <Progress value={n.usefulness} />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">{es ? "Examen" : "Exam usefulness"}</div>
                    <Progress value={n.examRelevance} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-indigo-200" />
                {es ? "Preguntas comunes" : "Common questions"}
              </CardTitle>
              <CardDescription>{es ? "Vota con utilidad, no con drama." : "Vote with usefulness, not drama."}</CardDescription>
            </CardHeader>
            <ul className="space-y-3">
              {questions.map((q) => (
                <li key={q.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                  <div className="text-sm text-slate-100">{q.question}</div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                    <span>
                      {q.votes} {es ? "votos" : "votes"}
                    </span>
                    <span>
                      ~{(answersByQuestion[q.id]?.length ?? 0) || q.answersApprox} {es ? "respuestas" : "answers"}
                    </span>
                    <Link href="/pass-mode" className="text-indigo-200 hover:text-white">
                      {es ? "Convertir en plan →" : "Turn into plan →"}
                    </Link>
                  </div>

                  {authUserId && isSupabaseConfigured() ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        className="min-h-[70px] w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none ring-indigo-400/30 focus:ring"
                        placeholder={es ? "Escribe una respuesta…" : "Write an answer…"}
                        value={answerDrafts[q.id] ?? ""}
                        onChange={(e) => setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={answerBusyId === q.id || !(answerDrafts[q.id] ?? "").trim()}
                          onClick={() => void submitAnswer(q.id)}
                        >
                          {answerBusyId === q.id ? (es ? "Enviando…" : "Sending…") : es ? "Responder" : "Answer"}
                        </Button>
                        {answerError ? <span className="text-xs text-rose-300">{answerError}</span> : null}
                      </div>

                      {(answersByQuestion[q.id] ?? []).length > 0 ? (
                        <div className="space-y-2">
                          {(answersByQuestion[q.id] ?? []).slice(0, 3).map((a) => (
                            <div key={a.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                              <div className="text-[11px] text-slate-500">
                                {es ? "Respuesta" : "Answer"}{" "}
                                <span suppressHydrationWarning>
                                  {new Date(a.created_at).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })}
                                </span>
                              </div>
                              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-100">{a.body}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">{es ? "Inicia sesión para responder." : "Sign in to answer."}</p>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <Flame className="h-5 w-5 text-amber-200" />
                {es ? "Discusiones en tendencia" : "Trending discussions"}
              </CardTitle>
              <CardDescription>{es ? "Señales de retención social." : "Social retention signals."}</CardDescription>
            </CardHeader>
            <ul className="space-y-3">
              {threads.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-3">
                  <div className="text-sm text-slate-100">{t.title}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    {t.replies} replies
                    <Badge tone={t.trend === "up" ? "warning" : "neutral"}>{t.trend === "up" ? "▲" : "—"}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{es ? "Alertas de clase" : "Class alerts"}</CardTitle>
          <CardDescription>{es ? "Cercanas a tus fechas y ritmo." : "Close to your dates and cadence."}</CardDescription>
        </CardHeader>
        <div className="space-y-3">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm",
                a.severity === "warning" ? "border-amber-300/25 bg-amber-400/5 text-amber-50" : "border-white/10 bg-white/5 text-slate-200",
              )}
            >
              <div className="font-semibold text-white">{a.title}</div>
              <div className="mt-1 text-slate-300">{a.body}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
