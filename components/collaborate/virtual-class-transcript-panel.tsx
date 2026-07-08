"use client";

import { FileAudio, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { collaborateCopy } from "@/lib/i18n/collaborate";

type Props = {
  sessionId: string;
  isCreator: boolean;
  transcriptText: string | null;
  transcriptUpdatedAt: string | null;
  onUpdated?: (text: string) => void;
};

export function VirtualClassTranscriptPanel({
  sessionId,
  isCreator,
  transcriptText,
  transcriptUpdatedAt,
  onUpdated,
}: Props) {
  const t = collaborateCopy.es;
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [localText, setLocalText] = useState(transcriptText);

  const showTranscript = Boolean(localText?.trim());

  if (!isCreator && !showTranscript) return null;

  async function handleUpload(file: File) {
    setBusy(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sessionId", sessionId);
      const res = await fetch("/api/collaborate/virtual-class/transcribe", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as { transcript?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || t.transcriptError);
      }
      const text = (data.transcript ?? "").trim();
      if (!text) throw new Error(t.transcriptEmpty);
      setLocalText(text);
      onUpdated?.(text);
      setMessage(t.transcriptOk);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t.transcriptError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-cyan-400/20 bg-cyan-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileAudio className="h-4 w-4 text-cyan-300" aria-hidden />
          {t.transcriptTitle}
        </CardTitle>
        <CardDescription>{isCreator ? t.transcriptHintCreator : t.transcriptHintStudent}</CardDescription>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        {isCreator ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="audio/*,video/webm,video/mp4"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              className="gap-1.5"
              onClick={() => inputRef.current?.click()}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-3.5 w-3.5" aria-hidden />
              )}
              {busy ? t.transcriptUploading : t.transcriptUploadCta}
            </Button>
            <p className="text-[11px] text-slate-500">{t.transcriptUploadFootnote}</p>
          </>
        ) : null}
        {showTranscript && localText ? (
          <div className="space-y-2">
            {transcriptUpdatedAt ? (
              <p className="text-[11px] text-slate-500">
                {t.transcriptUpdatedLabel(
                  new Date(transcriptUpdatedAt).toLocaleString("es-ES", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }),
                )}
              </p>
            ) : null}
            <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3 text-sm whitespace-pre-wrap text-slate-200">
              {localText}
            </div>
          </div>
        ) : isCreator ? (
          <p className="text-xs text-slate-500">{t.transcriptEmptyState}</p>
        ) : null}
        {message ? <p className="text-xs text-slate-400">{message}</p> : null}
      </div>
    </Card>
  );
}
