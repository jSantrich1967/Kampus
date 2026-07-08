"use client";

import { Loader2, MessageSquare, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStudyRoomChat } from "@/hooks/use-study-room-chat";
import { collaborateCopy } from "@/lib/i18n/collaborate";

type Props = {
  roomCode: string;
  hydrated: boolean;
};

export function StudyRoomChatPanel({ roomCode, hydrated }: Props) {
  const t = collaborateCopy.es;
  const { active, messages, sending, sendMessage } = useStudyRoomChat(roomCode, hydrated);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  if (!active) return null;

  async function handleSend() {
    const text = draft.trim();
    if (!text) return;
    const ok = await sendMessage(text);
    if (ok) setDraft("");
  }

  return (
    <Card className="border-indigo-400/20 bg-indigo-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4 text-indigo-300" aria-hidden />
          {t.studyRoomChatTitle}
        </CardTitle>
        <CardDescription>{t.studyRoomChatHint}</CardDescription>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        <div
          ref={listRef}
          className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3"
        >
          {messages.length === 0 ? (
            <p className="text-xs text-slate-500">{t.studyRoomChatEmpty}</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <span className="font-medium text-indigo-100/90">{msg.displayName}</span>
                <span className="mx-1.5 text-[10px] text-slate-600">
                  {new Date(msg.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <p className="mt-0.5 text-slate-200">{msg.body}</p>
              </div>
            ))
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            value={draft}
            maxLength={500}
            placeholder={t.studyRoomChatPlaceholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <Button type="button" size="sm" disabled={sending || !draft.trim()} onClick={() => void handleSend()} className="gap-1.5">
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Send className="h-3.5 w-3.5" />}
            {t.studyRoomChatSend}
          </Button>
        </div>
      </div>
    </Card>
  );
}
