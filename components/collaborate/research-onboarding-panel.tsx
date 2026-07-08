"use client";

import Link from "next/link";
import {
  Bell,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Microscope,
  PlayCircle,
  Sparkles,
  Timer,
} from "lucide-react";
import { useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { addStudentWork } from "@/lib/storage/student-work-storage";
import { collaborateCopy } from "@/lib/i18n/collaborate";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { bootstrapResearchDemoWorks } from "@/lib/supabase/agenda-db";

type Props = {
  useCloud: boolean;
  workCount: number;
  onDemoLoaded?: () => void;
};

const FEATURES = [
  { icon: Calendar, key: "researchFeatureCalendar" as const },
  { icon: ClipboardList, key: "researchFeatureList" as const },
  { icon: CheckCircle2, key: "researchFeatureDone" as const },
  { icon: Bell, key: "researchFeatureNotify" as const },
  { icon: Timer, key: "researchFeatureStudyRoom" as const },
  { icon: Microscope, key: "researchFeatureFilters" as const },
];

function localDemoWorks() {
  const pad = (n: number) => String(n).padStart(2, "0");
  const due = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  addStudentWork({
    title: "Kampus · Informe bibliográfico",
    subject: "Metodología",
    dueDate: due(5),
    notes: "Demo local — inicia sesión para sincronizar con la nube.",
  });
  addStudentWork({
    title: "Kampus · Borrador monografía",
    subject: "Investigación I",
    dueDate: due(12),
    notes: "Demo local en este navegador.",
  });
}

export function ResearchOnboardingPanel({ useCloud, workCount, onDemoLoaded }: Props) {
  const t = collaborateCopy.es;
  const { authUserId } = useKampus();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleDemo() {
    setBusy(true);
    setMessage(null);
    try {
      if (useCloud && authUserId && isSupabaseConfigured()) {
        const supabase = createSupabaseBrowserClient();
        const result = await bootstrapResearchDemoWorks(supabase, authUserId);
        if (!result.ok) {
          setMessage(t.researchDemoError);
          return;
        }
        setMessage(
          result.alreadyExists ? t.researchDemoExistsOk : t.researchDemoCreatedOk(result.inserted),
        );
      } else {
        localDemoWorks();
        setMessage(t.researchDemoLocalOk);
      }
      onDemoLoaded?.();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t.researchDemoError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-indigo-400/30 bg-gradient-to-br from-indigo-500/15 via-transparent to-teal-500/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-indigo-300" aria-hidden />
          {t.researchOnboardingTitle}
        </CardTitle>
        <CardDescription>{t.researchOnboardingHint}</CardDescription>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-200"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-indigo-300" aria-hidden />
              {t[key]}
            </div>
          ))}
        </div>

        <p className="text-sm text-slate-300">{t.researchSteps}</p>

        {!useCloud ? (
          <p className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
            {t.researchLocalOnlyHint}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={() => void handleDemo()} className="gap-1.5">
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <PlayCircle className="h-3.5 w-3.5" aria-hidden />
            )}
            {t.researchDemoCta}
          </Button>
          <Link href="/exams/calendar" className={buttonClasses({ size: "sm", variant: "secondary" })}>
            {t.calendarCta}
          </Link>
          <Link href="/collaborate/sala-estudio" className={buttonClasses({ size: "sm", variant: "ghost" })}>
            {t.subnavStudyRoom}
          </Link>
        </div>

        {workCount === 0 ? <p className="text-xs text-slate-500">{t.researchDemoFootnote}</p> : null}
        {message ? <p className="text-sm text-indigo-100/90">{message}</p> : null}
      </div>
    </Card>
  );
}
