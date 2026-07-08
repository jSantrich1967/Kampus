"use client";

import { Bell, BellRing, Loader2, Video } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  loadCollaborateDeadlineServerPushEnabled,
  registerCollaborateDeadlineServerPush,
  saveCollaborateDeadlineServerPushEnabled,
  unregisterCollaborateDeadlineServerPush,
} from "@/lib/collaborate/deadline-server-push-client";
import {
  loadCollaborateDeadlineNotifyEnabled,
  saveCollaborateDeadlineNotifyEnabled,
} from "@/lib/collaborate/deadline-notify-storage";
import { requestBrowserNotifyPermission, saveBrowserNotifyEnabled } from "@/lib/wellbeing/check-in-browser-notify";
import { registerWellbeingServiceWorker } from "@/lib/wellbeing/pwa-check-in";
import { serverPushSupported } from "@/lib/wellbeing/server-push-client";
import { useCollaborationDeadlineReminder } from "@/hooks/use-collaboration-deadline-reminder";
import { useVirtualClassReminder } from "@/hooks/use-virtual-class-reminder";
import {
  loadVirtualClassNotifyEnabled,
  saveVirtualClassNotifyEnabled,
} from "@/lib/collaborate/virtual-class-notify-storage";
import { collaborateCopy } from "@/lib/i18n/collaborate";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function CollaborateDeadlineNotifyPanel() {
  const t = collaborateCopy.es;
  const { authUserId } = useKampus();
  const [hydrated, setHydrated] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverEnabled, setServerEnabled] = useState(false);
  const [serverBusy, setServerBusy] = useState(false);
  const [serverConfigured, setServerConfigured] = useState<boolean | null>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [virtualEnabled, setVirtualEnabled] = useState(false);
  const [virtualBusy, setVirtualBusy] = useState(false);

  useCollaborationDeadlineReminder();
  useVirtualClassReminder();

  useEffect(() => {
    setHydrated(true);
    setEnabled(loadCollaborateDeadlineNotifyEnabled());
    setServerEnabled(loadCollaborateDeadlineServerPushEnabled());
    setVirtualEnabled(loadVirtualClassNotifyEnabled());
    void fetch("/api/wellbeing/push/vapid")
      .then((r) => r.json())
      .then((j: { configured?: boolean }) => setServerConfigured(Boolean(j.configured)))
      .catch(() => setServerConfigured(false));
  }, []);

  const toggle = useCallback(async () => {
    if (enabled) {
      saveCollaborateDeadlineNotifyEnabled(false);
      setEnabled(false);
      return;
    }
    setBusy(true);
    try {
      await registerWellbeingServiceWorker();
      const perm = await requestBrowserNotifyPermission();
      if (perm !== "granted") return;
      saveBrowserNotifyEnabled(true);
      saveCollaborateDeadlineNotifyEnabled(true);
      setEnabled(true);
    } finally {
      setBusy(false);
    }
  }, [enabled]);

  const toggleServer = useCallback(async () => {
    if (serverEnabled) {
      setServerBusy(true);
      try {
        await unregisterCollaborateDeadlineServerPush();
        setServerEnabled(false);
        setServerMessage(t.deadlineServerPushOffOk);
      } finally {
        setServerBusy(false);
      }
      return;
    }
    if (!authUserId || !isSupabaseConfigured()) {
      setServerMessage(t.deadlineServerPushLoginRequired);
      return;
    }
    setServerBusy(true);
    setServerMessage(null);
    try {
      await registerWellbeingServiceWorker();
      const perm = await requestBrowserNotifyPermission();
      if (perm !== "granted") {
        setServerMessage(t.deadlineServerPushDenied);
        return;
      }
      const ok = await registerCollaborateDeadlineServerPush();
      if (!ok) {
        setServerMessage(t.deadlineServerPushError);
        return;
      }
      saveCollaborateDeadlineServerPushEnabled(true);
      setServerEnabled(true);
      setServerMessage(t.deadlineServerPushOnOk);
    } finally {
      setServerBusy(false);
    }
  }, [
    authUserId,
    serverEnabled,
    t.deadlineServerPushDenied,
    t.deadlineServerPushError,
    t.deadlineServerPushLoginRequired,
    t.deadlineServerPushOffOk,
    t.deadlineServerPushOnOk,
  ]);

  const toggleVirtual = useCallback(async () => {
    if (virtualEnabled) {
      saveVirtualClassNotifyEnabled(false);
      setVirtualEnabled(false);
      return;
    }
    setVirtualBusy(true);
    try {
      await registerWellbeingServiceWorker();
      const perm = await requestBrowserNotifyPermission();
      if (perm !== "granted") return;
      saveBrowserNotifyEnabled(true);
      saveVirtualClassNotifyEnabled(true);
      setVirtualEnabled(true);
    } finally {
      setVirtualBusy(false);
    }
  }, [virtualEnabled]);

  if (!hydrated) return null;

  const showServerPush = serverPushSupported() && serverConfigured !== false;

  return (
    <Card className="border-orange-400/20 bg-orange-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-orange-300" aria-hidden />
          {t.deadlineNotifyTitle}
        </CardTitle>
        <CardDescription>{t.deadlineNotifyHint}</CardDescription>
      </CardHeader>
      <div className="space-y-4 px-6 pb-5">
        <div>
          <Button type="button" size="sm" variant={enabled ? "secondary" : "primary"} disabled={busy} onClick={() => void toggle()}>
            {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            {enabled ? t.deadlineNotifyOff : t.deadlineNotifyOn}
          </Button>
          <p className="mt-3 text-[11px] text-slate-500">{t.deadlineNotifyFootnote}</p>
        </div>

        {showServerPush ? (
          <div className="rounded-xl border border-orange-400/15 bg-black/20 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-orange-100/90">
              <BellRing className="h-4 w-4 text-orange-300" aria-hidden />
              {t.deadlineServerPushTitle}
            </p>
            <p className="mt-1 text-xs text-slate-400">{t.deadlineServerPushHint}</p>
            <Button
              type="button"
              size="sm"
              variant={serverEnabled ? "secondary" : "primary"}
              className="mt-3"
              disabled={serverBusy}
              onClick={() => void toggleServer()}
            >
              {serverBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
              {serverEnabled ? t.deadlineServerPushOff : t.deadlineServerPushOn}
            </Button>
            {serverMessage ? <p className="mt-2 text-xs text-slate-400">{serverMessage}</p> : null}
            <p className="mt-3 text-[11px] text-slate-500">{t.deadlineServerPushFootnote}</p>
          </div>
        ) : null}

        <div className="rounded-xl border border-teal-400/15 bg-black/20 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-teal-100/90">
            <Video className="h-4 w-4 text-teal-300" aria-hidden />
            {t.virtualClassNotifyTitle}
          </p>
          <p className="mt-1 text-xs text-slate-400">{t.virtualClassNotifyHint}</p>
          <Button
            type="button"
            size="sm"
            variant={virtualEnabled ? "secondary" : "primary"}
            className="mt-3"
            disabled={virtualBusy}
            onClick={() => void toggleVirtual()}
          >
            {virtualBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            {virtualEnabled ? t.virtualClassNotifyOff : t.virtualClassNotifyOn}
          </Button>
          <p className="mt-3 text-[11px] text-slate-500">{t.virtualClassNotifyFootnote}</p>
        </div>
      </div>
    </Card>
  );
}
