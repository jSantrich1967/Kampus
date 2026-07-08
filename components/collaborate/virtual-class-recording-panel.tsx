"use client";

import { Film, Loader2, Save } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { collaborateCopy } from "@/lib/i18n/collaborate";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { updateVirtualClassRecordingUrl } from "@/lib/supabase/virtual-class-breakout-db";

type Props = {
  sessionId: string;
  isCreator: boolean;
  recordingUrl: string | null;
  sessionStarted: boolean;
  onUpdated?: (url: string | null) => void;
};

export function VirtualClassRecordingPanel({
  sessionId,
  isCreator,
  recordingUrl,
  sessionStarted,
  onUpdated,
}: Props) {
  const t = collaborateCopy.es;
  const [draft, setDraft] = useState(recordingUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const showRecording = Boolean(recordingUrl?.trim()) && (sessionStarted || isCreator);

  if (!isCreator && !showRecording) return null;

  async function handleSave() {
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const url = draft.trim() || null;
      await updateVirtualClassRecordingUrl(supabase, sessionId, url);
      onUpdated?.(url);
      setMessage(t.recordingSavedOk);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t.recordingSaveError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-amber-400/20 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Film className="h-4 w-4 text-amber-300" aria-hidden />
          {t.recordingTitle}
        </CardTitle>
        <CardDescription>{isCreator ? t.recordingHintCreator : t.recordingHintStudent}</CardDescription>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        {isCreator ? (
          <>
            <input
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.recordingUrlPlaceholder}
            />
            <Button type="button" size="sm" disabled={busy} onClick={() => void handleSave()} className="gap-1.5">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Save className="h-3.5 w-3.5" />}
              {t.recordingSaveCta}
            </Button>
          </>
        ) : null}
        {showRecording && recordingUrl ? (
          <a
            href={recordingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex text-sm text-amber-200 underline-offset-2 hover:underline"
          >
            {t.recordingWatchCta}
          </a>
        ) : isCreator && !recordingUrl?.trim() ? (
          <p className="text-xs text-slate-500">{t.recordingEmpty}</p>
        ) : null}
        {message ? <p className="text-xs text-slate-400">{message}</p> : null}
      </div>
    </Card>
  );
}
