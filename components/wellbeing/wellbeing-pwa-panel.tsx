"use client";

import { Check, Download, Loader2, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  isStandalonePwa,
  loadPwaRemindersEnabled,
  pwaSupported,
  registerWellbeingServiceWorker,
  savePwaRemindersEnabled,
  type BeforeInstallPromptEvent,
} from "@/lib/wellbeing/pwa-check-in";
import { requestBrowserNotifyPermission, saveBrowserNotifyEnabled } from "@/lib/wellbeing/check-in-browser-notify";
import { usePwaCheckInScheduler } from "@/hooks/use-pwa-check-in-scheduler";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

export function WellbeingPwaPanel() {
  const t = wellbeingCopy.es;
  const [hydrated, setHydrated] = useState(false);
  const [pwaEnabled, setPwaEnabled] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installedFlash, setInstalledFlash] = useState(false);

  usePwaCheckInScheduler(pwaEnabled);

  useEffect(() => {
    setHydrated(true);
    setPwaEnabled(loadPwaRemindersEnabled());
    setStandalone(isStandalonePwa());

    if (!pwaSupported()) return;

    void registerWellbeingServiceWorker();

    const onBip = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const enablePwaReminders = useCallback(async () => {
    setBusy(true);
    try {
      await registerWellbeingServiceWorker();
      const perm = await requestBrowserNotifyPermission();
      if (perm !== "granted") return;
      saveBrowserNotifyEnabled(true);
      savePwaRemindersEnabled(true);
      setPwaEnabled(true);
    } finally {
      setBusy(false);
    }
  }, []);

  const disablePwaReminders = useCallback(() => {
    savePwaRemindersEnabled(false);
    setPwaEnabled(false);
  }, []);

  async function onInstall() {
    if (!installPrompt) return;
    setBusy(true);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalledFlash(true);
        setInstallPrompt(null);
        window.setTimeout(() => setInstalledFlash(false), 4000);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated || !pwaSupported()) return null;

  return (
    <Card className="border-indigo-400/20 bg-indigo-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Smartphone className="h-4 w-4 text-indigo-300" aria-hidden />
          {t.pwaTitle}
        </CardTitle>
        <CardDescription>{standalone ? t.pwaInstalledHint : t.pwaHint}</CardDescription>
      </CardHeader>
      <div className="flex flex-wrap gap-2 px-6 pb-5">
        {installPrompt && !standalone ? (
          <Button type="button" size="sm" variant="primary" disabled={busy} onClick={() => void onInstall()} className="gap-1.5">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Download className="h-3.5 w-3.5" aria-hidden />}
            {t.pwaInstallCta}
          </Button>
        ) : null}
        {installedFlash ? (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-200">
            <Check className="h-4 w-4" aria-hidden />
            {t.pwaInstalledFlash}
          </span>
        ) : null}
        {!pwaEnabled ? (
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void enablePwaReminders()}>
            {t.pwaRemindersOn}
          </Button>
        ) : (
          <Button type="button" size="sm" variant="ghost" onClick={disablePwaReminders}>
            {t.pwaRemindersOff}
          </Button>
        )}
      </div>
      <p className="px-6 pb-5 text-[11px] text-slate-500">{t.pwaLimitHint}</p>
    </Card>
  );
}
