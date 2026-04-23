"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { todayCopy } from "@/lib/i18n/today";
import { shouldShowAuthBypassWarning } from "@/lib/supabase/env";
import {
  loadAuthBypassBannerDismissed,
  saveAuthBypassBannerDismissed,
} from "@/lib/storage/auth-bypass-banner-storage";

/**
 * Compact notice on Hoy when auth middleware is bypassed; shares dismiss state with Ajustes.
 */
export function TodayAuthBypassNote() {
  const t = todayCopy.es;
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);
  const envWantsNotice = shouldShowAuthBypassWarning();

  useEffect(() => {
    setDismissed(loadAuthBypassBannerDismissed());
    setReady(true);
  }, []);

  if (!envWantsNotice || !ready || dismissed) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-100/95 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <p>
        <span className="font-medium text-amber-50">{t.authBypassChipLabel}</span>
        <span className="text-amber-200/70"> · </span>
        <Link href="/settings" className="text-amber-200 underline-offset-2 hover:underline">
          {t.authBypassChipSettings}
        </Link>
      </p>
      <button
        type="button"
        className="shrink-0 text-left text-amber-200/85 hover:text-amber-50 sm:text-right"
        onClick={() => {
          saveAuthBypassBannerDismissed();
          setDismissed(true);
        }}
      >
        {t.authBypassChipDismiss}
      </button>
    </div>
  );
}
