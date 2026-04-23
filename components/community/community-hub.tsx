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
  const { profile, locale } = useKampus();
  const es = locale === "es";

  const [context, setContext] = useState<CommunityContext>("subject");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

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

  const channels = useMemo(() => buildChannels(profile, context), [profile, context]);
  const notes = useMemo(() => buildTopNotes(profile), [profile]);
  const questions = useMemo(() => buildCommonQuestions(profile), [profile]);
  const threads = useMemo(() => buildTrendingThreads(profile), [profile]);
  const peers = useMemo(() => buildPeerExplanations(profile), [profile]);
  const alerts = useMemo(() => buildClassAlerts(profile), [profile]);

  useEffect(() => {
    if (!selectedChannelId) return;
    if (!channels.some((c) => c.id === selectedChannelId)) {
      setSelectedChannelId(null);
    }
  }, [channels, selectedChannelId]);

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
              pathname="/rescue"
              campaign="rescue_pack"
              refHandle={profile.university || "kampus"}
              label={es ? "Compartir rescate" : "Share rescue"}
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
                    <span>{q.votes} votes</span>
                    <span>~{q.answersApprox} peer answers</span>
                    <Link href="/pass-mode" className="text-indigo-200 hover:text-white">
                      {es ? "Convertir en plan →" : "Turn into plan →"}
                    </Link>
                  </div>
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
