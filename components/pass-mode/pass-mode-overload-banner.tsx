"use client";

import { Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { passModeCopy } from "@/lib/i18n/pass-mode";
import type { PassPlanIntensity } from "@/lib/pass-mode";

type PassModeOverloadBannerProps = {
  visible: boolean;
  onSwitchToMinimal: () => void;
  onKeepFull: () => void;
  currentIntensity: PassPlanIntensity;
};

export function PassModeOverloadBanner({
  visible,
  onSwitchToMinimal,
  onKeepFull,
  currentIntensity,
}: PassModeOverloadBannerProps) {
  const t = passModeCopy.es;
  if (!visible) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 to-orange-500/10 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Zap className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-white">{t.overloadBannerTitle}</p>
          <p className="mt-0.5 text-sm text-amber-100/90">{t.overloadBannerBody}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {currentIntensity !== "minimal" ? (
          <Button type="button" size="sm" onClick={onSwitchToMinimal}>
            {t.overloadSwitchMinimal}
          </Button>
        ) : null}
        {currentIntensity === "minimal" ? (
          <Button type="button" size="sm" variant="secondary" onClick={onKeepFull}>
            {t.overloadKeepMinimal}
          </Button>
        ) : (
          <Button type="button" size="sm" variant="ghost" onClick={onKeepFull}>
            {t.overloadKeepFull}
          </Button>
        )}
      </div>
    </div>
  );
}
