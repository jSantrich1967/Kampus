"use client";

import { Flame } from "lucide-react";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getStudyStreak, type StudyStreak } from "@/lib/supabase/study-streak-db";
import { cn } from "@/lib/cn";

function dayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("es-VE", { weekday: "narrow" });
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function StudyStreakCard() {
  const [streak, setStreak] = useState<StudyStreak | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const s = await getStudyStreak(supabase);
        if (!cancelled) setStreak(s);
      } catch {
        /* widget opcional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!streak) return null;

  const activeDays = new Set(streak.days);
  const week = Array.from({ length: 7 }, (_, i) => isoDaysAgo(6 - i));

  return (
    <Card className="border-orange-400/20 bg-orange-500/5">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl",
              streak.current > 0 ? "bg-orange-500/20" : "bg-white/5",
            )}
          >
            <Flame className={cn("h-6 w-6", streak.current > 0 ? "text-orange-300" : "text-slate-500")} />
          </span>
          <div>
            <p className="text-sm text-slate-400">Racha de estudio</p>
            <p className="text-xl font-bold text-white">
              {streak.current} {streak.current === 1 ? "día" : "días"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {week.map((iso) => {
            const active = activeDays.has(iso);
            return (
              <div key={iso} className="flex flex-col items-center gap-1">
                <span
                  title={iso}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-semibold uppercase",
                    active
                      ? "border-orange-400/50 bg-orange-500/25 text-orange-200"
                      : "border-white/10 bg-black/20 text-slate-500",
                  )}
                >
                  {dayLabel(iso)}
                </span>
                <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-orange-300" : "bg-white/10")} />
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-white">{streak.longest}</p>
            <p className="text-[11px] text-slate-500">récord</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">{streak.total}</p>
            <p className="text-[11px] text-slate-500">días totales</p>
          </div>
        </div>
      </div>
      {streak.current === 0 ? (
        <p className="px-6 pb-4 text-xs text-slate-500">
          Completa una sesión de tu plan, un quiz o convierte material para empezar tu racha hoy.
        </p>
      ) : null}
    </Card>
  );
}
