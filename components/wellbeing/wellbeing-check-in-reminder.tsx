"use client";

import Link from "next/link";
import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useDiaryCheckInStatus } from "@/hooks/use-diary-check-in-status";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  dismissCheckInReminderForToday,
  shouldShowCheckInReminder,
} from "@/lib/wellbeing/check-in-reminder";
import { fireCheckInBrowserNotification } from "@/lib/wellbeing/check-in-browser-notify";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

type Props = {
  compact?: boolean;
};

export function WellbeingCheckInReminder({ compact = false }: Props) {
  const t = wellbeingCopy.es;
  const { hasCheckedInToday, loading } = useDiaryCheckInStatus();
  const [visible, setVisible] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const update = () => {
      const show = shouldShowCheckInReminder(hasCheckedInToday);
      setVisible(show);
      if (show) {
        fireCheckInBrowserNotification(t.checkInReminderTitle, t.browserNotifyBody);
      }
    };
    update();
    const id = window.setInterval(() => {
      setTick((n) => n + 1);
      update();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [hasCheckedInToday, t.checkInReminderTitle, t.browserNotifyBody]);

  if (loading || !visible) return null;

  function dismiss() {
    dismissCheckInReminderForToday();
    setVisible(false);
  }

  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-sm">
        <span className="flex items-center gap-2 text-violet-100">
          <Bell className="h-4 w-4 shrink-0" aria-hidden />
          {t.checkInReminderTitle}
        </span>
        <div className="flex gap-2">
          <Link href="/wellbeing/diary">
            <Button size="sm">{t.checkInReminderCta}</Button>
          </Link>
          <Button size="sm" variant="ghost" onClick={dismiss} aria-label={t.checkInReminderDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-violet-400/25 bg-gradient-to-br from-violet-500/10 to-transparent">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-5 w-5 text-violet-300" aria-hidden />
            {t.checkInReminderTitle}
          </CardTitle>
          <CardDescription>{t.checkInReminderHint}</CardDescription>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={dismiss} aria-label={t.checkInReminderDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <div className="px-6 pb-4">
        <Link href="/wellbeing/diary">
          <Button size="sm">{t.checkInReminderCta}</Button>
        </Link>
      </div>
    </Card>
  );
}
