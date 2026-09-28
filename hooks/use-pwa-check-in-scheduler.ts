"use client";

import { useEffect } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";
import { readAccountItem, writeAccountItem } from "@/lib/storage/account-box";
import { msUntilNextCheckInHour, showPwaCheckInNotification } from "@/lib/wellbeing/pwa-check-in";

const LAST_PWA_FIRED_BASE = "kampus.wellbeing.pwaNotify.lastFired.v1";

export function usePwaCheckInScheduler(enabled: boolean): void {
  const { authUserId } = useKampus();

  useEffect(() => {
    if (!enabled) return;

    let timeoutId: number | undefined;
    let intervalId: number | undefined;

    const maybeNotify = () => {
      const today = new Date().toISOString().slice(0, 10);
      if (readAccountItem(LAST_PWA_FIRED_BASE, authUserId) === today) return;

      const hour = new Date().getHours();
      if (hour < 18) return;

      const t = wellbeingCopy.es;
      void showPwaCheckInNotification(t.checkInReminderTitle, t.browserNotifyBody, "/wellbeing/diary", authUserId).then(
        (sent) => {
          if (sent) writeAccountItem(LAST_PWA_FIRED_BASE, today, authUserId);
        },
      );
    };

    const scheduleNext = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        maybeNotify();
        intervalId = window.setInterval(maybeNotify, 60_000);
      }, msUntilNextCheckInHour(18));
    };

    maybeNotify();
    scheduleNext();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [enabled, authUserId]);
}
