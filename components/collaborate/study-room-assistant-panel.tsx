"use client";

import { Bot, Loader2, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildStudyRoomAssistantContext } from "@/lib/collaborate/study-room-assistant-context";
import { collaborateCopy } from "@/lib/i18n/collaborate";
import type { StudyRoomState } from "@/lib/storage/study-room-storage";

type ChatTurn = { role: "user" | "assistant"; content: string };

type Props = {
  roomCode: string;
  state: StudyRoomState;
};

export function StudyRoomAssistantPanel({ roomCode, state }: Props) {
  const t = collaborateCopy.es;
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const contextBlock = buildStudyRoomAssistantContext(state, roomCode);

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
        const res = await fetch("/api/collaborate/study-room/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextHistory,
            context: contextBlock,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
        if (!res.ok) {
          throw new Error(data.error || `Error ${res.status}`);
        }
        const reply = (data.reply ?? "").trim();
        if (!reply) throw new Error(t.studyRoomAssistantEmptyReply);
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : t.studyRoomAssistantError;
        setError(msg);
        setMessages((prev) => prev.slice(0, -1));
        setDraft(trimmed);
      } finally {
        setBusy(false);
      }
    },
    [busy, contextBlock, messages, t.studyRoomAssistantEmptyReply, t.studyRoomAssistantError],
  );

  return (
    <Card className="border-violet-400/20 bg-violet-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4 text-violet-300" aria-hidden />
          {t.studyRoomAssistantTitle}
        </CardTitle>
        <CardDescription>{t.studyRoomAssistantHint}</CardDescription>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        <div
          ref={listRef}
          className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3"
        >
          {messages.length === 0 ? (
            <p className="text-xs text-slate-500">{t.studyRoomAssistantEmpty}</p>
          ) : (
            messages.map((msg, idx) => (
              <div key={`${idx}-${msg.role}`} className="text-sm">
                <span className="font-medium text-violet-100/90">
                  {msg.role === "assistant" ? t.studyRoomAssistantBotLabel : t.studyRoomAssistantYouLabel}
                </span>
                <p className="mt-0.5 whitespace-pre-wrap text-slate-200">{msg.content}</p>
              </div>
            ))
          )}
          {busy ? (
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {t.studyRoomAssistantThinking}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            value={draft}
            maxLength={800}
            placeholder={t.studyRoomAssistantPlaceholder}
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
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Send className="h-3.5 w-3.5" />}
            {t.studyRoomAssistantSend}
          </Button>
        </div>
        {error ? <p className="text-xs text-rose-200/90">{error}</p> : null}
        <p className="text-[11px] text-slate-500">{t.studyRoomAssistantFootnote}</p>
      </div>
    </Card>
  );
}
