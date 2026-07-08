"use client";

import { Link2, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { collaborateCopy } from "@/lib/i18n/collaborate";

export function VirtualClassWebcalPanel() {
  const t = collaborateCopy.es;
  const [subscribeUrl, setSubscribeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/collaborate/calendar/webcal/token");
      if (!res.ok) {
        setSubscribeUrl(null);
        setMessage(t.webcalLoginRequired);
        return;
      }
      const json = (await res.json()) as { subscribeUrl?: string };
      setSubscribeUrl(json.subscribeUrl ?? null);
    } catch {
      setSubscribeUrl(null);
      setMessage(t.webcalError);
    } finally {
      setLoading(false);
    }
  }, [t.webcalError, t.webcalLoginRequired]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCopy() {
    if (!subscribeUrl) return;
    try {
      await navigator.clipboard.writeText(subscribeUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage(t.webcalCopyError);
    }
  }

  async function handleRotate() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/collaborate/calendar/webcal/token", { method: "POST" });
      if (!res.ok) {
        setMessage(t.webcalError);
        return;
      }
      const json = (await res.json()) as { subscribeUrl?: string };
      setSubscribeUrl(json.subscribeUrl ?? null);
      setMessage(t.webcalRotatedOk);
    } catch {
      setMessage(t.webcalError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-teal-400/20 bg-teal-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4 text-teal-300" aria-hidden />
          {t.webcalTitle}
        </CardTitle>
        <CardDescription>{t.webcalHint}</CardDescription>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        {loading ? (
          <p className="text-sm text-slate-400">{t.webcalLoading}</p>
        ) : subscribeUrl ? (
          <>
            <input
              readOnly
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-300"
              value={subscribeUrl}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => void handleCopy()}>
                {copied ? t.webcalCopied : t.webcalCopy}
              </Button>
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void handleRotate()} className="gap-1.5">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RefreshCw className="h-3.5 w-3.5" />}
                {t.webcalRotate}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">{message ?? t.webcalLoginRequired}</p>
        )}
        {message && subscribeUrl ? <p className="text-xs text-slate-500">{message}</p> : null}
        <p className="text-[11px] text-slate-500">{t.webcalFootnote}</p>
      </div>
    </Card>
  );
}
