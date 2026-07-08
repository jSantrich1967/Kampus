"use client";

import Link from "next/link";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  browserNotifySupported,
  loadBrowserNotifyEnabled,
  requestBrowserNotifyPermission,
  saveBrowserNotifyEnabled,
} from "@/lib/wellbeing/check-in-browser-notify";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

export function WellbeingNotificationToggle() {
  const t = wellbeingCopy.es;
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setEnabled(loadBrowserNotifyEnabled());
    setPermission(browserNotifySupported() ? Notification.permission : "unsupported");
  }, []);

  const toggle = useCallback(async () => {
    if (!browserNotifySupported()) return;
    setBusy(true);
    try {
      if (!enabled) {
        const result = await requestBrowserNotifyPermission();
        setPermission(result);
        if (result !== "granted") return;
        saveBrowserNotifyEnabled(true);
        setEnabled(true);
      } else {
        saveBrowserNotifyEnabled(false);
        setEnabled(false);
      }
    } finally {
      setBusy(false);
    }
  }, [enabled]);

  if (!hydrated || permission === "unsupported") return null;

  return (
    <Card className="border-violet-400/20 bg-violet-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {enabled ? <Bell className="h-4 w-4 text-violet-300" aria-hidden /> : <BellOff className="h-4 w-4 text-slate-400" aria-hidden />}
          {t.browserNotifyTitle}
        </CardTitle>
        <CardDescription>
          {permission === "denied" ? t.browserNotifyDenied : t.browserNotifyHint}
        </CardDescription>
      </CardHeader>
      <div className="px-6 pb-5">
        <Button
          type="button"
          size="sm"
          variant={enabled ? "secondary" : "primary"}
          disabled={busy || permission === "denied"}
          onClick={() => void toggle()}
          className="gap-1.5"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          {enabled ? t.browserNotifyOff : t.browserNotifyOn}
        </Button>
      </div>
    </Card>
  );
}
