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
import {
  EmptyState,
  EmptyStateIllustrationCommunity,
  EmptyStatePrimaryCta,
  EmptyStateSecondaryCta,
} from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { StatBlock } from "@/components/ui/stat-block";
import type { CommunityContext } from "@/lib/community-types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/cn";
import { useSupabaseSWR } from "@/lib/hooks/use-supabase-swr";

const contexts: { id: CommunityContext; es: string; en: string }[] = [
  { id: "subject", es: "Materia", en: "Subject" },
  { id: "exam", es: "Examen", en: "Exam" },
  { id: "professor", es: "Profesor", en: "Professor" },
  { id: "semester", es: "Semestre", en: "Semester" },
  { id: "topic", es: "Tema", en: "Topic" },
  { id: "university", es: "Universidad", en: "University" },
];

type Heat = "quiet" | "active" | "hot";

type CommunityChannel = {
  id: string;
  title: string;
  subtitle: string;
  heat: Heat;
  membersApprox: number;
};

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

function stableHeatFromId(id: string): Heat {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const m = h % 3;
  if (m === 0) return "hot";
  if (m === 1) return "active";
  return "quiet";
}

function buildRealChannels(profile: { subjects?: string[]; upcomingExams?: { subject: string; date: string }[]; university?: string; semester?: string }, context: CommunityContext, es: boolean): CommunityChannel[] {
  const subjects = profile.subjects ?? [];
  const upcomingExams = profile.upcomingExams ?? [];
  const uni = profile.university || (es ? "Campus" : "Campus");
  const sem = profile.semester || (es ? "2026-1" : "2026-1");

  if (context === "university") {
    return [
      {
        id: `uni:${uni}:boletin`,
        title: es ? `${uni} · boletín` : `${uni} · bulletin`,
        subtitle: es ? "Anuncios generales y avisos." : "General announcements and notices.",
        heat: "active",
        membersApprox: 0,
      },
    ];
  }

  if (context === "semester") {
    return [
      {
        id: `sem:${sem}:general`,
        title: es ? `${sem} · general` : `${sem} · general`,
        subtitle: es ? "Organización, fechas y hábitos." : "Planning, dates, and habits.",
        heat: "active",
        membersApprox: 0,
      },
    ];
  }

  if (context === "exam") {
    if (upcomingExams.length === 0) {
      return [
        {
          id: "exam:sin-examenes",
          title: es ? "Exámenes (sin fechas)" : "Exams (no dates)",
          subtitle: es ? "Agrega fechas de examen en Ajustes para habilitar canales por examen." : "Add exam dates in Settings to enable exam channels.",
          heat: "quiet",
          membersApprox: 0,
        },
      ];
    }
    return upcomingExams.slice(0, 12).map((e) => {
      const id = `exam:${e.subject}:${e.date}`;
      return {
        id,
        title: es ? `${e.subject} · examen` : `${e.subject} · exam`,
        subtitle: es ? `Fecha: ${e.date}` : `Date: ${e.date}`,
        heat: stableHeatFromId(id),
        membersApprox: 0,
      };
    });
  }

  if (context === "professor") {
    if (subjects.length === 0) {
      return [
        {
          id: "prof:sin-materias",
          title: es ? "Profesores (sin materias)" : "Professors (no subjects)",
          subtitle: es ? "Agrega materias en Ajustes para organizar por profesor." : "Add subjects in Settings to organize by professor.",
          heat: "quiet",
          membersApprox: 0,
        },
      ];
    }
    return subjects.slice(0, 12).map((s) => {
      const id = `prof:${s}`;
      return {
        id,
        title: es ? `${s} · cohorte` : `${s} · cohort`,
        subtitle: es ? "Preguntas frecuentes y estilo de evaluación." : "FAQs and evaluation style.",
        heat: stableHeatFromId(id),
        membersApprox: 0,
      };
    });
  }

  if (context === "topic") {
    const weakTopics = (profile as { weakTopics?: string[] }).weakTopics ?? [];
    const topics = weakTopics.length ? weakTopics : [];
    if (topics.length === 0) {
      return [
        {
          id: "topic:sin-temas",
          title: es ? "Temas (sin lista)" : "Topics (empty)",
          subtitle: es ? "Agrega temas débiles en onboarding para organizar por tema." : "Add weak topics in onboarding to organize by topic.",
          heat: "quiet",
          membersApprox: 0,
        },
      ];
    }
    return topics.slice(0, 12).map((t) => {
      const id = `topic:${t}`;
      return {
        id,
        title: es ? `${t}` : `${t}`,
        subtitle: es ? "Dudas y recursos del tema." : "Questions and resources for the topic.",
        heat: stableHeatFromId(id),
        membersApprox: 0,
      };
    });
  }

  // subject (default)
  if (subjects.length === 0) {
    return [
      {
        id: "sub:general",
        title: es ? "General" : "General",
        subtitle: es ? "Publicaciones generales mientras configuras tus materias." : "General posts while you configure your subjects.",
        heat: "quiet",
        membersApprox: 0,
      },
    ];
  }
  return subjects.slice(0, 12).map((s) => {
    const id = `sub:${s}`;
    return {
      id,
      title: es ? s : s,
      subtitle: es ? "Sala de estudio" : "Study hall",
      heat: stableHeatFromId(id),
      membersApprox: 0,
    };
  });
}

function resolveChannelNavigation(profile: { subjects?: string[]; upcomingExams?: { subject: string; date: string }[]; university?: string; semester?: string; weakTopics?: string[] }, channelId: string): { context: CommunityContext } | null {
  const es = true;
  for (const ctx of contexts.map((c) => c.id)) {
    if (buildRealChannels(profile, ctx, es).some((c) => c.id === channelId)) return { context: ctx };
  }
  return null;
}

export function CommunityHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, locale, authUserId } = useKampus();
  const es = locale === "es";

  const [context, setContext] = useState<CommunityContext>("subject");
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

  const channels = useMemo(() => buildRealChannels(profile, context, es), [profile, context, es]);

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

  const { data: swrPosts } = useSupabaseSWR<
    { id: string; channel_id: string; body: string; created_at: string; user_id: string }[]
  >(authUserId ? `community_posts:${authUserId}` : null, async (supabase) => {
    const { data, error } = await supabase
      .from("community_posts")
      .select("id,channel_id,body,created_at,user_id")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data as typeof posts) ?? [];
  });

  const { data: swrAnswers } = useSupabaseSWR<
    { id: string; question_id: string; body: string; created_at: string; user_id: string }[]
  >(authUserId ? `community_answers:${authUserId}` : null, async (supabase) => {
    const { data, error } = await supabase
      .from("community_question_answers")
      .select("id,question_id,body,created_at,user_id")
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) throw error;
    return (data as { id: string; question_id: string; body: string; created_at: string; user_id: string }[]) ?? [];
  });

  useEffect(() => {
    if (!authUserId || !isSupabaseConfigured()) {
      setPosts([]);
      setAnswersByQuestion({});
      return;
    }
    setPosts(swrPosts ?? []);
    const grouped: typeof answersByQuestion = {};
    (swrAnswers ?? []).forEach((row) => {
      if (!grouped[row.question_id]) grouped[row.question_id] = [];
      grouped[row.question_id]!.push(row);
    });
    setAnswersByQuestion(grouped);
  }, [authUserId, swrPosts, swrAnswers]);

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
          label={es ? "Contenido" : "Content"}
          value={posts.length}
          hint={es ? "Posts reales en Supabase." : "Real Supabase posts."}
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
                    href="/collaborate/aula-virtual"
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
              <EmptyState
                icon={<EmptyStateIllustrationCommunity />}
                title={es ? "Todavía no hay conversación aquí" : "No conversation yet"}
                description={
                  es
                    ? "Haz una pregunta concreta o comparte un resumen corto. Un buen primer post desbloquea respuestas útiles (y reduce el ruido)."
                    : "Ask a concrete question or share a short summary. A good first post unlocks useful answers."
                }
                actions={
                  authUserId ? (
                    <>
                      <EmptyStatePrimaryCta onClick={() => (document.querySelector("textarea") as HTMLTextAreaElement | null)?.focus()}>
                        {es ? "Escribir el primer post" : "Write the first post"}
                      </EmptyStatePrimaryCta>
                      <Link href="/collaborate/aula-virtual">
                        <EmptyStateSecondaryCta>{es ? "Crear grupo de estudio" : "Start a study group"}</EmptyStateSecondaryCta>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link href="/login">
                        <EmptyStatePrimaryCta>{es ? "Iniciar sesión para publicar" : "Sign in to post"}</EmptyStatePrimaryCta>
                      </Link>
                      <Link href="/register">
                        <EmptyStateSecondaryCta>{es ? "Crear cuenta" : "Create account"}</EmptyStateSecondaryCta>
                      </Link>
                    </>
                  )
                }
              />
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

      <Card className="border-white/10 bg-slate-950/40">
        <CardHeader>
          <CardTitle>{es ? "Más funciones de comunidad" : "More community features"}</CardTitle>
          <CardDescription>
            {es
              ? "Ya puedes publicar y responder (contenido real en Supabase). Lo siguiente será: recursos compartidos, hilos en tendencia, votos y moderación."
              : "You can already post and answer (real Supabase content). Next: shared resources, trending threads, voting, and moderation."}
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6 text-sm text-slate-400">
          {es
            ? "Por ahora removimos los datos demo para evitar mocks en producción."
            : "For now we removed demo data to avoid mocks in production."}
        </div>
      </Card>
    </div>
  );
}
