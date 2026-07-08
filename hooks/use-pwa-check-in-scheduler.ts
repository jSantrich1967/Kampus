"use client";

import { useEffect } from "react";

import { wellbeingCopy } from "@/lib/i18n/wellbeing";
import { msUntilNextCheckInHour, showPwaCheckInNotification } from "@/lib/wellbeing/pwa-check-in";

const LAST_PWA_FIRED_KEY = "kampus.wellbeing.pwaNotify.lastFired.v1";

export function usePwaCheckInScheduler(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    let timeoutId: number | undefined;
    let intervalId: number | undefined;

    const maybeNotify = () => {
      const today = new Date().toISOString().slice(0, 10);
      if (window.localStorage.getItem(LAST_PWA_FIRED_KEY) === today) return;

      const hour = new Date().getHours();
      if (hour < 18) return;

      const t = wellbeingCopy.es;
      void showPwaCheckInNotification(t.checkInReminderTitle, t.browserNotifyBody).then((sent) => {
        if (sent) window.localStorage.setItem(LAST_PWA_FIRED_KEY, today);
      });
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
  }, [enabled]);
}
