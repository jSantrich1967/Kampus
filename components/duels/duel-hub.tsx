"use client";

import { Loader2, Plus, Swords, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { duelsCopy } from "@/lib/i18n/duels";
import { normalizeDuelCode } from "@/lib/duels/types";

export function DuelHub() {
  const router = useRouter();
  const { profile, authUserId } = useKampus();
  const t = duelsCopy.es;

  const [subject, setSubject] = useState(profile.subjects?.[0] ?? "");
  const [topic, setTopic] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  const loggedIn = Boolean(authUserId);

  async function createDuel() {
    if (creating || subject.trim().length < 2) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/duels/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), topic: topic.trim(), playerName: name.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { duel?: { code: string }; error?: string };
      if (!res.ok || !data.duel) throw new Error(data.error || t.errorMessage);
      router.push(`/duelos/${data.duel.code}`);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : t.errorMessage);
    } finally {
      setCreating(false);
    }
  }

  function joinDuel() {
    const normalized = normalizeDuelCode(code);
    if (!normalized) {
      setJoinError(t.errorMessage);
      return;
    }
    setJoinError(null);
    router.push(`/duelos/${normalized}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-amber-400/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-amber-300" aria-hidden />
              {t.createTitle}
            </CardTitle>
            <CardDescription>{t.createHint}</CardDescription>
          </CardHeader>
          <div className="space-y-3 px-6 pb-6">
            {!loggedIn ? (
              <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-400">
                {t.loginRequired}
              </p>
            ) : null}
            <div>
              <label htmlFor="duel-subject" className="mb-1 block text-xs font-medium text-slate-300">
                {t.subjectLabel}
              </label>
              <input
                id="duel-subject"
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                value={subject}
                maxLength={120}
                placeholder={t.subjectPlaceholder}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="duel-topic" className="mb-1 block text-xs font-medium text-slate-300">
                {t.topicLabel}
              </label>
              <input
                id="duel-topic"
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                value={topic}
                maxLength={200}
                placeholder={t.topicPlaceholder}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="duel-name" className="mb-1 block text-xs font-medium text-slate-300">
                {t.nameLabel}
              </label>
              <input
                id="duel-name"
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                value={name}
                maxLength={60}
                placeholder={t.namePlaceholder}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {createError ? <p className="text-xs text-rose-200/90">{createError}</p> : null}
            <Button
              type="button"
              onClick={createDuel}
              disabled={creating || !loggedIn || subject.trim().length < 2}
              className="w-full gap-2"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Swords className="h-4 w-4" aria-hidden />
              )}
              {creating ? t.creatingLabel : t.createCta}
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="border-indigo-400/20 bg-indigo-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Ticket className="h-4 w-4 text-indigo-300" aria-hidden />
                {t.joinTitle}
              </CardTitle>
              <CardDescription>{t.joinHint}</CardDescription>
            </CardHeader>
            <div className="space-y-3 px-6 pb-6">
              <div>
                <label htmlFor="duel-code" className="mb-1 block text-xs font-medium text-slate-300">
                  {t.codeLabel}
                </label>
                <input
                  id="duel-code"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm uppercase tracking-widest text-white placeholder:text-slate-500 placeholder:normal-case placeholder:tracking-normal"
                  value={code}
                  maxLength={12}
                  placeholder={t.codePlaceholder}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") joinDuel();
                  }}
                />
              </div>
              {joinError ? <p className="text-xs text-rose-200/90">{joinError}</p> : null}
              <Button
                type="button"
                variant="secondary"
                onClick={joinDuel}
                disabled={!normalizeDuelCode(code)}
                className="w-full"
              >
                {t.joinCta}
              </Button>
            </div>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-base">{t.practiceTitle}</CardTitle>
              <CardDescription>{t.practiceHint}</CardDescription>
            </CardHeader>
            <div className="px-6 pb-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/duelos/practica")}
                className="w-full"
              >
                {t.practiceCta}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
