"use client";

import { Bot, Loader2, Plus, Send, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { tutorCopy } from "@/lib/i18n/tutor";

type ChatTurn = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "kampus_socratic_tutor_v1";

function loadStored(): { subject: string; messages: ChatTurn[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { subject?: unknown; messages?: unknown };
    if (typeof parsed.subject !== "string" || !Array.isArray(parsed.messages)) return null;
    const messages = parsed.messages
      .filter(
        (m): m is ChatTurn =>
          typeof m === "object" &&
          m !== null &&
          (m as ChatTurn).role !== undefined &&
          typeof (m as ChatTurn).content === "string",
      )
      .slice(-24);
    return { subject: parsed.subject, messages };
  } catch {
    return null;
  }
}

export function SocraticTutorPanel() {
  const { profile } = useKampus();
  const t = tutorCopy.es;
  const [subject, setSubject] = useState("");
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  const [hydratedLocal, setHydratedLocal] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = loadStored();
    if (stored) {
      setSubject(stored.subject);
      setMessages(stored.messages);
    } else if (profile.subjects?.[0]) {
      setSubject(profile.subjects[0]);
    }
    setHydratedLocal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydratedLocal) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ subject, messages: messages.slice(-24) }));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [subject, messages, hydratedLocal]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;

      setError(null);
      setBusy(true);
      const nextHistory: ChatTurn[] = [...messages, { role: "user", content: trimmed }];
      setMessages(nextHistory);
      setDraft("");

      try {
        const res = await fetch("/api/tutor/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextHistory,
            subject: subject.trim(),
            level: "university",
          }),
          // La IA puede tardar, pero nunca debe colgar la interfaz:
          // a los 90 s soltamos con error visible.
          signal: AbortSignal.timeout(90_000),
        });
        const data = (await res.json().catch(() => ({}))) as {
          reply?: string;
          error?: string;
          quota?: { used: number; limit: number };
        };
        if (!res.ok) {
          throw new Error(data.error || `Error ${res.status}`);
        }
        if (data.quota) setQuota(data.quota);
        const reply = (data.reply ?? "").trim();
        if (!reply) throw new Error(t.emptyReplyMessage);
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : t.errorMessage;
        setError(msg);
        setMessages((prev) => prev.slice(0, -1));
        setDraft(trimmed);
      } finally {
        setBusy(false);
      }
    },
    [busy, messages, subject, t.emptyReplyMessage, t.errorMessage],
  );

  function startNewChat() {
    setMessages([]);
    setError(null);
    setDraft("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{t.socraticBadge}</Badge>
            {quota ? (
              <Badge tone="neutral">
                {quota.used}/{quota.limit}
              </Badge>
            ) : null}
            <Button type="button" size="sm" variant="secondary" onClick={startNewChat} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {t.newChatLabel}
            </Button>
          </div>
        }
      />

      <Card className="border-indigo-400/20 bg-indigo-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4 text-indigo-300" aria-hidden />
            {t.hint}
          </CardTitle>
          <CardDescription>{t.disclaimer}</CardDescription>
        </CardHeader>
        <div className="space-y-3 px-6 pb-6">
          <div>
            <label htmlFor="tutor-subject" className="mb-1 block text-xs font-medium text-slate-300">
              {t.subjectLabel}
            </label>
            <input
              id="tutor-subject"
              className="w-full max-w-md rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500"
              value={subject}
              maxLength={120}
              placeholder={t.subjectPlaceholder}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div
            ref={listRef}
            className="max-h-[420px] min-h-[240px] space-y-4 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-4"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <div className="py-6 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-indigo-300/60" aria-hidden />
                <p className="mt-3 font-medium text-white">{t.emptyTitle}</p>
                <p className="mt-1 text-sm text-slate-400">{t.emptyHint}</p>
                <div className="mx-auto mt-4 flex max-w-lg flex-wrap justify-center gap-2">
                  {t.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void sendMessage(s)}
                      disabled={busy}
                      className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-100 transition hover:bg-indigo-500/20 disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={`${idx}-${msg.role}`}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "border border-white/10 bg-white/5 text-slate-100"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-indigo-300/80">
                        <Bot className="h-3 w-3" aria-hidden />
                        Tutor
                      </p>
                    ) : null}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            {busy ? (
              <div className="flex justify-start">
                <p className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  {t.sendingLabel}
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500"
              value={draft}
              maxLength={2000}
              placeholder={t.inputPlaceholder}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage(draft);
                }
              }}
              disabled={busy}
            />
            <Button
              type="button"
              size="sm"
              disabled={busy || !draft.trim()}
              onClick={() => void sendMessage(draft)}
              className="gap-1.5"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Send className="h-3.5 w-3.5" aria-hidden />
              )}
              {t.sendLabel}
            </Button>
          </div>
          {error ? <p className="text-xs text-rose-200/90">{error}</p> : null}
          <p className="text-[11px] text-slate-500">{t.quotaNote}</p>
        </div>
      </Card>
    </div>
  );
}
