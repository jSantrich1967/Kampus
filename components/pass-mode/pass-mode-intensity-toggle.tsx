"use client";

import { cn } from "@/lib/cn";
import type { PassPlanIntensity } from "@/lib/pass-mode";
import { passModeCopy } from "@/lib/i18n/pass-mode";

type PassModeIntensityToggleProps = {
  intensity: PassPlanIntensity;
  onChange: (next: PassPlanIntensity) => void;
  planLabel: string;
};

export function PassModeIntensityToggle({ intensity, onChange, planLabel }: PassModeIntensityToggleProps) {
  const t = passModeCopy.es;

  const modes: { id: PassPlanIntensity; label: string; hint: string }[] = [
    { id: "full", label: t.intensityFull, hint: t.intensityFullHint },
    { id: "minimal", label: t.intensityMinimal, hint: t.intensityMinimalHint },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{t.intensityTitle}</p>
          <p className="text-xs text-slate-400">{planLabel}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={cn(
              "rounded-xl px-4 py-2 text-left transition",
              intensity === mode.id
                ? "bg-purple-600 text-white ring-1 ring-purple-400/50"
                : "border border-white/10 bg-black/20 text-slate-300 hover:bg-white/5",
            )}
            onClick={() => onChange(mode.id)}
          >
            <span className="block text-sm font-semibold">{mode.label}</span>
            <span className="block text-xs opacity-80">{mode.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
