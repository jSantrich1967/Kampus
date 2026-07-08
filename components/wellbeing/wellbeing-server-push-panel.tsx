"use client";

import { BellRing, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requestBrowserNotifyPermission, saveBrowserNotifyEnabled } from "@/lib/wellbeing/check-in-browser-notify";
import {
  loadServerPushEnabled,
  registerServerPushSubscription,
  saveServerPushEnabled,
  serverPushSupported,
  unregisterServerPushSubscription,
} from "@/lib/wellbeing/server-push-client";
import { registerWellbeingServiceWorker } from "@/lib/wellbeing/pwa-check-in";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

export function WellbeingServerPushPanel() {
  const t = wellbeingCopy.es;
  const { authUserId } = useKampus();
  const [hydrated, setHydrated] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
    setEnabled(loadServerPushEnabled());
    void fetch("/api/wellbeing/push/vapid")
      .then((r) => r.json())
      .then((j: { configured?: boolean }) => setConfigured(Boolean(j.configured)))
      .catch(() => setConfigured(false));
  }, []);

  const enable = useCallback(async () => {
    if (!authUserId || !isSupabaseConfigured()) {
      setMessage(t.serverPushLoginRequired);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await registerWellbeingServiceWorker();
      const perm = await requestBrowserNotifyPermission();
      if (perm !== "granted") {
        setMessage(t.browserNotifyDenied);
        return;
      }
      const ok = await registerServerPushSubscription();
      if (!ok) {
        setMessage(t.serverPushError);
        return;
      }
      saveBrowserNotifyEnabled(true);
      saveServerPushEnabled(true);
      setEnabled(true);
      setMessage(t.serverPushOnOk);
    } finally {
      setBusy(false);
    }
  }, [authUserId, t.browserNotifyDenied, t.serverPushError, t.serverPushLoginRequired, t.serverPushOnOk]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      await unregisterServerPushSubscription();
      saveServerPushEnabled(false);
      setEnabled(false);
      setMessage(t.serverPushOffOk);
    } finally {
      setBusy(false);
    }
  }, [t.serverPushOffOk]);

  if (!hydrated || !serverPushSupported()) return null;
  if (configured === false) return null;

  return (
    <Card className="border-emerald-400/20 bg-emerald-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="h-4 w-4 text-emerald-300" aria-hidden />
          {t.serverPushTitle}
        </CardTitle>
        <CardDescription>{t.serverPushHint}</CardDescription>
      </CardHeader>
      <div className="flex flex-wrap gap-2 px-6 pb-5">
        {!enabled ? (
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void enable()}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            {t.serverPushOn}
          </Button>
        ) : (
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void disable()}>
            {t.serverPushOff}
          </Button>
        )}
      </div>
      {message ? <p className="px-6 pb-5 text-xs text-slate-400">{message}</p> : null}
      <p className="px-6 pb-5 text-[11px] text-slate-500">{t.serverPushCronHint}</p>
    </Card>
  );
}
